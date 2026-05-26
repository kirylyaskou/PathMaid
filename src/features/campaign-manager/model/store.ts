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
  type CampaignBucket,
  type CampaignDocument,
  type CampaignLink,
  type CampaignNode,
  type CampaignTable,
} from '@/entities/campaign'
import { createKeyedLatestTask } from './autosave'

type CampaignManagerMode = 'editor' | 'graph'

interface DocumentSaveTask {
  nodeId: string
  markdown: string
}

interface TableSaveTask {
  nodeId: string
  table: CampaignTable
}

interface LinkRefreshTask {
  nodeId: string
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
  closeCampaign: () => void
  setMode: (mode: CampaignManagerMode) => void
  openNode: (nodeId: string) => Promise<void>
  createNode: (input: CampaignManagerCreateNodeInput) => Promise<string>
  patchDocumentMarkdown: (nodeId: string, markdown: string) => void
  patchTable: (nodeId: string, table: CampaignTable) => void
  refreshDocument: (nodeId: string) => Promise<void>
  togglePin: (nodeId: string) => Promise<void>
  refreshLinksForNode: (nodeId: string) => Promise<void>
}

interface CampaignManagerCreateNodeInput extends CreateNodeInput {
  bucket?: CampaignBucket
}

const AUTOSAVE_DELAY_MS = 600
const LINK_REFRESH_DELAY_MS = 250

let openCampaignRequestSequence = 0
let openNodeRequestSequence = 0
let loadingRequestSequence = 0

const saveDocumentLatest = createKeyedLatestTask<DocumentSaveTask, string>(
  AUTOSAVE_DELAY_MS,
  (value) => value.nodeId,
  async (value) => {
    await updateCampaignDocument(value.nodeId, { markdown: value.markdown })
  },
)

const saveTableLatest = createKeyedLatestTask<TableSaveTask, string>(
  AUTOSAVE_DELAY_MS,
  (value) => value.nodeId,
  async (value) => {
    await updateCampaignTable(value.nodeId, {
      columns: value.table.columns,
      rows: value.table.rows,
      cells: value.table.cells,
      columnSizes: value.table.columnSizes,
      rowSizes: value.table.rowSizes,
    })
  },
)

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
  immer((set, get) => {
    const refreshLinksLatest = createKeyedLatestTask<LinkRefreshTask, string>(
      LINK_REFRESH_DELAY_MS,
      (value) => value.nodeId,
      async (value) => {
        const campaignId = get().activeCampaignId
        const node = findNodeById(get().nodes, value.nodeId)
        if (!campaignId || !node || !isOpenableCampaignNode(node)) {
          return
        }

        const extractedLinks =
          node.kind === 'table'
            ? extractTableLinks(get().tables[value.nodeId]?.cells ?? {}, get().nodes)
            : extractMarkdownLinks(get().documents[value.nodeId]?.markdown ?? '', get().nodes)

        await replaceCampaignLinks(campaignId, value.nodeId, extractedLinks)
        const links = await listCampaignLinks(campaignId)

        if (get().activeCampaignId !== campaignId) {
          return
        }

        set((state) => {
          state.links = links
        })
      },
    )

    return {
      campaigns: [],
      ...emptyWorkspace(),
      loading: false,

    loadCampaigns: async () => {
      const loadingRequestId = ++loadingRequestSequence

      set((state) => {
        state.loading = true
      })

      try {
        const campaigns = await listCampaigns()
        set((state) => {
          state.campaigns = campaigns
        })
      } finally {
        if (loadingRequestId === loadingRequestSequence) {
          set((state) => {
            state.loading = false
          })
        }
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
          openCampaignRequestSequence += 1
          openNodeRequestSequence += 1
          Object.assign(state, emptyWorkspace())
        }
      })
    },

    openCampaign: async (id) => {
      const requestId = ++openCampaignRequestSequence
      const loadingRequestId = ++loadingRequestSequence
      openNodeRequestSequence += 1

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

        if (requestId !== openCampaignRequestSequence) {
          return
        }

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
        if (
          requestId === openCampaignRequestSequence &&
          loadingRequestId === loadingRequestSequence
        ) {
          set((state) => {
            state.loading = false
          })
        }
      }

      if (requestId === openCampaignRequestSequence && firstOpenableNodeId) {
        await get().openNode(firstOpenableNodeId)
      }
    },

    closeCampaign: () => {
      openCampaignRequestSequence += 1
      openNodeRequestSequence += 1
      loadingRequestSequence += 1

      set((state) => {
        Object.assign(state, emptyWorkspace())
        state.loading = false
      })
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

      const campaignId = node.campaignId
      const requestId = ++openNodeRequestSequence

      if (node.kind === 'table') {
        if (!get().tables[nodeId]) {
          const table = await getCampaignTable(nodeId)
          if (table && canApplyOpenNode(get(), requestId, campaignId, nodeId)) {
            set((state) => {
              state.tables[nodeId] = table
            })
          }
        }
      } else if (!get().documents[nodeId]) {
        const document = await getCampaignDocument(nodeId)
        if (document && canApplyOpenNode(get(), requestId, campaignId, nodeId)) {
          set((state) => {
            state.documents[nodeId] = document
          })
        }
      }

      if (!canApplyOpenNode(get(), requestId, campaignId, nodeId)) {
        return
      }

      set((state) => {
        state.activeNodeId = nodeId
        state.mode = 'editor'
      })
    },

    createNode: async (input) => {
      const campaignRequestId = openCampaignRequestSequence
      const openNodeRequestId = openNodeRequestSequence
      const id = await createCampaignNode(input)
      const nodes = await listCampaignNodes(input.campaignId)
      const activeCampaignId = get().activeCampaignId

      if (
        activeCampaignId !== input.campaignId ||
        campaignRequestId !== openCampaignRequestSequence
      ) {
        return id
      }

      set((state) => {
        state.nodes = nodes
      })

      if (
        get().activeCampaignId === input.campaignId &&
        openNodeRequestId === openNodeRequestSequence
      ) {
        await get().openNode(id)
      }

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

      saveDocumentLatest({ nodeId, markdown })
      refreshLinksLatest({ nodeId })
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

      saveTableLatest({ nodeId, table: nextTable })
      refreshLinksLatest({ nodeId })
    },

    refreshDocument: async (nodeId) => {
      const node = findNodeById(get().nodes, nodeId)
      if (!node || node.kind === 'table') {
        return
      }

      const document = await getCampaignDocument(nodeId)
      if (!document || get().activeCampaignId !== node.campaignId) {
        return
      }

      set((state) => {
        state.documents[nodeId] = document
      })
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
      refreshLinksLatest({ nodeId })
    },
    }
  }),
)

function canApplyOpenNode(
  state: CampaignManagerState,
  requestId: number,
  campaignId: string,
  nodeId: string,
): boolean {
  const node = findNodeById(state.nodes, nodeId)
  return (
    requestId === openNodeRequestSequence &&
    state.activeCampaignId === campaignId &&
    node?.campaignId === campaignId &&
    isOpenableCampaignNode(node)
  )
}
