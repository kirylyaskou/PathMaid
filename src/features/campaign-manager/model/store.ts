import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  createCampaign,
  createCampaignNode,
  deleteCampaign,
  getCampaignDocument,
  getCampaignTable,
  listCampaignLinks,
  listCampaignNodes,
  listCampaignPins,
  listCampaigns,
  markCampaignOpened,
  replaceCampaignLinks,
  setCampaignPins,
  updateCampaignDocument,
  updateCampaignTable,
  type CreateNodeInput,
} from '@/shared/api'
import {
  extractMarkdownLinks,
  extractTableLinks,
  findNodeById,
  isOpenableCampaignNode,
  type Campaign,
  type CampaignDocument,
  type CampaignLink,
  type CampaignNode,
  type CampaignTable,
} from '@/entities/campaign'
import { createDebouncedTask } from './autosave'

type CampaignManagerMode = 'editor' | 'graph'

interface DocumentSaveTask {
  nodeId: string
  markdown: string
}

interface TableSaveTask {
  nodeId: string
  table: CampaignTable
}

interface CampaignManagerState {
  campaigns: Campaign[]
  activeCampaignId: string | null
  nodes: CampaignNode[]
  links: CampaignLink[]
  pins: string[]
  activeNodeId: string | null
  documents: Record<string, CampaignDocument>
  tables: Record<string, CampaignTable>
  mode: CampaignManagerMode
  loading: boolean

  loadCampaigns: () => Promise<void>
  createNewCampaign: (name: string) => Promise<string>
  deleteExistingCampaign: (id: string) => Promise<void>
  openCampaign: (id: string) => Promise<void>
  setMode: (mode: CampaignManagerMode) => void
  openNode: (nodeId: string) => Promise<void>
  createNode: (input: CreateNodeInput) => Promise<string>
  patchDocumentMarkdown: (nodeId: string, markdown: string) => void
  patchTable: (nodeId: string, table: CampaignTable) => void
  togglePin: (nodeId: string) => Promise<void>
  refreshLinksForNode: (nodeId: string) => Promise<void>
}

const AUTOSAVE_DELAY_MS = 600

const documentSavers = new Map<string, (value: DocumentSaveTask) => void>()
const tableSavers = new Map<string, (value: TableSaveTask) => void>()

function getDocumentSaver(nodeId: string): (value: DocumentSaveTask) => void {
  const existing = documentSavers.get(nodeId)
  if (existing) {
    return existing
  }

  const saver = createDebouncedTask<DocumentSaveTask>(AUTOSAVE_DELAY_MS, async (value) => {
    await updateCampaignDocument(value.nodeId, { markdown: value.markdown })
  })
  documentSavers.set(nodeId, saver)
  return saver
}

function getTableSaver(nodeId: string): (value: TableSaveTask) => void {
  const existing = tableSavers.get(nodeId)
  if (existing) {
    return existing
  }

  const saver = createDebouncedTask<TableSaveTask>(AUTOSAVE_DELAY_MS, async (value) => {
    await updateCampaignTable(value.nodeId, {
      columns: value.table.columns,
      rows: value.table.rows,
      cells: value.table.cells,
      columnSizes: value.table.columnSizes,
      rowSizes: value.table.rowSizes,
    })
  })
  tableSavers.set(nodeId, saver)
  return saver
}

function emptyWorkspace() {
  return {
    activeCampaignId: null,
    nodes: [],
    links: [],
    pins: [],
    activeNodeId: null,
    documents: {},
    tables: {},
    mode: 'editor' as const,
  }
}

export const useCampaignManagerStore = create<CampaignManagerState>()(
  immer((set, get) => ({
    campaigns: [],
    ...emptyWorkspace(),
    loading: false,

    loadCampaigns: async () => {
      set((state) => {
        state.loading = true
      })

      try {
        const campaigns = await listCampaigns()
        set((state) => {
          state.campaigns = campaigns
        })
      } finally {
        set((state) => {
          state.loading = false
        })
      }
    },

    createNewCampaign: async (name) => {
      const id = await createCampaign({ name })
      await get().loadCampaigns()
      return id
    },

    deleteExistingCampaign: async (id) => {
      await deleteCampaign(id)
      set((state) => {
        state.campaigns = state.campaigns.filter((campaign) => campaign.id !== id)

        if (state.activeCampaignId === id) {
          Object.assign(state, emptyWorkspace())
        }
      })
    },

    openCampaign: async (id) => {
      set((state) => {
        state.loading = true
      })

      let firstOpenableNodeId: string | null = null

      try {
        await markCampaignOpened(id)
        const [nodes, pins, links] = await Promise.all([
          listCampaignNodes(id),
          listCampaignPins(id),
          listCampaignLinks(id),
        ])
        firstOpenableNodeId = nodes.find(isOpenableCampaignNode)?.id ?? null

        set((state) => {
          state.activeCampaignId = id
          state.nodes = nodes
          state.links = links
          state.pins = pins.map((pin) => pin.nodeId)
          state.activeNodeId = firstOpenableNodeId
          state.documents = {}
          state.tables = {}
          state.mode = 'editor'
        })
      } finally {
        set((state) => {
          state.loading = false
        })
      }

      if (firstOpenableNodeId) {
        await get().openNode(firstOpenableNodeId)
      }
    },

    setMode: (mode) =>
      set((state) => {
        state.mode = mode
      }),

    openNode: async (nodeId) => {
      const node = findNodeById(get().nodes, nodeId)
      if (!node || !isOpenableCampaignNode(node)) {
        return
      }

      if (node.kind === 'table') {
        if (!get().tables[nodeId]) {
          const table = await getCampaignTable(nodeId)
          if (table) {
            set((state) => {
              state.tables[nodeId] = table
            })
          }
        }
      } else if (!get().documents[nodeId]) {
        const document = await getCampaignDocument(nodeId)
        if (document) {
          set((state) => {
            state.documents[nodeId] = document
          })
        }
      }

      set((state) => {
        state.activeNodeId = nodeId
        state.mode = 'editor'
      })
    },

    createNode: async (input) => {
      const id = await createCampaignNode(input)
      const nodes = await listCampaignNodes(input.campaignId)

      set((state) => {
        state.nodes = nodes
      })

      await get().openNode(id)
      return id
    },

    patchDocumentMarkdown: (nodeId, markdown) => {
      const current = get().documents[nodeId]
      if (!current) {
        return
      }

      const nextDocument: CampaignDocument = { ...current, markdown }

      set((state) => {
        state.documents[nodeId] = nextDocument
      })

      getDocumentSaver(nodeId)({ nodeId, markdown })
      void get().refreshLinksForNode(nodeId)
    },

    patchTable: (nodeId, table) => {
      const nextTable: CampaignTable = {
        ...table,
        columns: table.columns.map((column) => ({ ...column })),
        rows: table.rows.map((row) => ({ ...row })),
        cells: Object.fromEntries(
          Object.entries(table.cells).map(([rowId, row]) => [rowId, { ...row }]),
        ),
        columnSizes: { ...table.columnSizes },
        rowSizes: { ...table.rowSizes },
      }

      set((state) => {
        state.tables[nodeId] = nextTable
      })

      getTableSaver(nodeId)({ nodeId, table: nextTable })
      void get().refreshLinksForNode(nodeId)
    },

    togglePin: async (nodeId) => {
      const campaignId = get().activeCampaignId
      const node = findNodeById(get().nodes, nodeId)
      if (!campaignId || !node || !isOpenableCampaignNode(node)) {
        return
      }

      const pins = get().pins.includes(nodeId)
        ? get().pins.filter((pinId) => pinId !== nodeId)
        : [...get().pins, nodeId]

      set((state) => {
        state.pins = pins
      })
      await setCampaignPins(campaignId, pins)
    },

    refreshLinksForNode: async (nodeId) => {
      const campaignId = get().activeCampaignId
      const node = findNodeById(get().nodes, nodeId)
      if (!campaignId || !node || !isOpenableCampaignNode(node)) {
        return
      }

      const extractedLinks =
        node.kind === 'table'
          ? extractTableLinks(get().tables[nodeId]?.cells ?? {}, get().nodes)
          : extractMarkdownLinks(get().documents[nodeId]?.markdown ?? '', get().nodes)

      await replaceCampaignLinks(campaignId, nodeId, extractedLinks)
      const links = await listCampaignLinks(campaignId)

      set((state) => {
        state.links = links
      })
    },
  })),
)
