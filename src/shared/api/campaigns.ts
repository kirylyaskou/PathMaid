import {
  type Campaign,
  type CampaignAsset,
  type CampaignBucket,
  type CampaignDocument,
  type CampaignLink,
  type CampaignLinkSourceKind,
  type CampaignNode,
  type CampaignNodeKind,
  type CampaignPin,
  type CampaignTable,
  type CampaignTableCells,
  type CampaignTableColumn,
  type CampaignTableRow,
  type CampaignTableSizes,
} from '@/shared/api/campaign-types'
import { getDb } from '@/shared/db'

export interface CreateCampaignInput {
  name: string
  description?: string
  accentColor?: string
  coverAssetId?: string | null
}

export interface CreateNodeInput {
  campaignId: string
  parentId: string | null
  kind: Exclude<CampaignNodeKind, 'bucket'>
  title: string
}

interface CampaignRow {
  id: string
  name: string
  description: string
  accent_color: string
  cover_asset_id: string | null
  last_opened_at: string | null
  created_at: string
  updated_at: string
}

interface CampaignNodeRow {
  id: string
  campaign_id: string
  parent_id: string | null
  kind: CampaignNodeKind
  bucket: CampaignBucket
  title: string
  sort_order: number
  is_system: number
  created_at: string
  updated_at: string
}

interface CampaignDocumentRow {
  node_id: string
  markdown: string
  profile_json: string
  cover_asset_id: string | null
  linked_db_refs_json: string
  updated_at: string
}

interface CampaignTableRowRecord {
  node_id: string
  columns_json: string
  rows_json: string
  cells_json: string
  column_sizes_json: string
  row_sizes_json: string
  updated_at: string
}

interface CampaignLinkRow {
  id: string
  campaign_id: string
  source_node_id: string
  target_node_id: string
  source_kind: CampaignLinkSourceKind
  label: string
  created_from: string
  created_at: string
}

interface CampaignPinRow {
  campaign_id: string
  node_id: string
  sort_order: number
  created_at: string
}

interface CampaignAssetRow {
  id: string
  campaign_id: string
  kind: CampaignAsset['kind']
  file_name: string
  mime_type: string
  relative_path: string
  created_at: string
}

export interface UpdateCampaignInput {
  name?: string
  description?: string
  accentColor?: string
  coverAssetId?: string | null
}

export interface UpdateCampaignDocumentInput {
  markdown?: string
  profileJson?: string
  coverAssetId?: string | null
  linkedDbRefsJson?: string
}

export interface UpdateCampaignTableInput {
  columns: CampaignTableColumn[]
  rows: CampaignTableRow[]
  cells: CampaignTableCells
  columnSizes: CampaignTableSizes
  rowSizes: CampaignTableSizes
}

export interface ReplaceCampaignLinkInput {
  targetNodeId: string
  sourceKind: CampaignLinkSourceKind
  label: string
  createdFrom: string
}

export interface CreateCampaignAssetInput {
  id?: string
  campaignId: string
  kind: CampaignAsset['kind']
  fileName: string
  mimeType: string
  relativePath: string
}

const CAMPAIGN_COLUMNS = `
  id, name, description, accent_color, cover_asset_id, last_opened_at, created_at, updated_at
`

const NODE_COLUMNS = `
  id, campaign_id, parent_id, kind, bucket, title, sort_order, is_system, created_at, updated_at
`

const DOCUMENT_COLUMNS = `
  node_id, markdown, profile_json, cover_asset_id, linked_db_refs_json, updated_at
`

const TABLE_COLUMNS = `
  node_id, columns_json, rows_json, cells_json, column_sizes_json, row_sizes_json, updated_at
`

const LINK_COLUMNS = `
  id, campaign_id, source_node_id, target_node_id, source_kind, label, created_from, created_at
`

const PIN_COLUMNS = 'campaign_id, node_id, sort_order, created_at'

const ASSET_COLUMNS = 'id, campaign_id, kind, file_name, mime_type, relative_path, created_at'

let campaignWriteQueue: Promise<void> = Promise.resolve()

async function runCampaignWrite<T>(task: () => Promise<T>): Promise<T> {
  const previous = campaignWriteQueue
  let releaseQueue: () => void = () => {}

  campaignWriteQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve
  })

  await previous.catch(() => undefined)

  try {
    return await task()
  } finally {
    releaseQueue()
  }
}

async function runCampaignBatch<T>(task: () => Promise<T>): Promise<T> {
  return runCampaignWrite(task)
}

const CAMPAIGN_BUCKET_ROWS: Array<{
  bucket: CampaignBucket
  title: string
  sortOrder: number
}> = [
  { bucket: 'notes', title: 'Notes', sortOrder: 0 },
  { bucket: 'tables', title: 'Tables', sortOrder: 1 },
  { bucket: 'npcs', title: 'NPCs', sortOrder: 2 },
  { bucket: 'items', title: 'Items', sortOrder: 3 },
  { bucket: 'locations', title: 'Locations', sortOrder: 4 },
]

function nowISO(): string {
  return new Date().toISOString()
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    accentColor: row.accent_color,
    coverAssetId: row.cover_asset_id,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapNode(row: CampaignNodeRow): CampaignNode {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    parentId: row.parent_id,
    kind: row.kind,
    bucket: row.bucket,
    title: row.title,
    sortOrder: row.sort_order,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDocument(row: CampaignDocumentRow): CampaignDocument {
  return {
    nodeId: row.node_id,
    markdown: row.markdown,
    profileJson: row.profile_json,
    coverAssetId: row.cover_asset_id,
    linkedDbRefsJson: row.linked_db_refs_json,
    updatedAt: row.updated_at,
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapTable(row: CampaignTableRowRecord): CampaignTable {
  return {
    nodeId: row.node_id,
    columns: parseJson<CampaignTableColumn[]>(row.columns_json, []),
    rows: parseJson<CampaignTableRow[]>(row.rows_json, []),
    cells: parseJson<CampaignTableCells>(row.cells_json, {}),
    columnSizes: parseJson<CampaignTableSizes>(row.column_sizes_json, {}),
    rowSizes: parseJson<CampaignTableSizes>(row.row_sizes_json, {}),
    updatedAt: row.updated_at,
  }
}

function mapLink(row: CampaignLinkRow): CampaignLink {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    sourceKind: row.source_kind,
    label: row.label,
    createdFrom: row.created_from,
    createdAt: row.created_at,
  }
}

function mapPin(row: CampaignPinRow): CampaignPin {
  return {
    campaignId: row.campaign_id,
    nodeId: row.node_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

function mapAsset(row: CampaignAssetRow): CampaignAsset {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    kind: row.kind,
    fileName: row.file_name,
    mimeType: row.mime_type,
    relativePath: row.relative_path,
    createdAt: row.created_at,
  }
}

function bucketForKind(kind: Exclude<CampaignNodeKind, 'bucket'>): CampaignBucket {
  if (kind === 'table') return 'tables'
  if (kind === 'npc') return 'npcs'
  if (kind === 'item') return 'items'
  if (kind === 'location') return 'locations'
  return 'notes'
}

function nodeBucket(
  kind: Exclude<CampaignNodeKind, 'bucket'>,
  parent: CampaignNode | undefined,
): CampaignBucket {
  if (kind === 'folder' || kind === 'note') return parent?.bucket ?? 'notes'
  return bucketForKind(kind)
}

function defaultTable(now: string): UpdateCampaignTableInput & { updatedAt: string } {
  return {
    columns: [{ id: `campaign-table-column-${crypto.randomUUID()}`, title: 'Column 1' }],
    rows: [{ id: `campaign-table-row-${crypto.randomUUID()}`, title: 'Row 1' }],
    cells: {},
    columnSizes: {},
    rowSizes: {},
    updatedAt: now,
  }
}

function noteBucketNodeId(campaignId: string): string {
  return `campaign-node-${campaignId}-notes`
}

function starterNoteNodeId(campaignId: string): string {
  return `campaign-node-${campaignId}-session-notes`
}

async function createStarterNote(
  db: Awaited<ReturnType<typeof getDb>>,
  campaignId: string,
  now: string,
): Promise<string> {
  const nodeId = starterNoteNodeId(campaignId)
  await db.execute(
    `INSERT OR IGNORE INTO campaign_nodes (${NODE_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nodeId,
      campaignId,
      noteBucketNodeId(campaignId),
      'note',
      'notes',
      'Session Notes',
      0,
      0,
      now,
      now,
    ],
  )
  await db.execute(
    `INSERT OR IGNORE INTO campaign_documents (${DOCUMENT_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nodeId, '', '{}', null, '[]', now],
  )
  return nodeId
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDb()
  const rows = await db.select<CampaignRow[]>(
    `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns ORDER BY updated_at DESC`,
    [],
  )
  return rows.map(mapCampaign)
}

export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const id = `campaign-${crypto.randomUUID()}`
  const now = nowISO()
  const db = await getDb()

  return runCampaignBatch(async () => {
    await db.execute(
      `INSERT INTO campaigns (
         id, name, description, accent_color, cover_asset_id, last_opened_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.description ?? '',
        input.accentColor ?? '#8f2f2f',
        input.coverAssetId ?? null,
        now,
        now,
        now,
      ],
    )

    for (const node of CAMPAIGN_BUCKET_ROWS) {
      await db.execute(
        `INSERT INTO campaign_nodes (${NODE_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `campaign-node-${id}-${node.bucket}`,
          id,
          null,
          'bucket',
          node.bucket,
          node.title,
          node.sortOrder,
          1,
          now,
          now,
        ],
      )
    }

    await createStarterNote(db, id, now)

    return id
  })
}

export async function ensureCampaignStarterNote(campaignId: string): Promise<string> {
  const db = await getDb()
  const rows = await db.select<Array<{ id: string }>>(
    `SELECT id
     FROM campaign_nodes
     WHERE campaign_id = ? AND kind IN ('note', 'table', 'npc', 'item', 'location')
     ORDER BY sort_order ASC, title ASC
     LIMIT 1`,
    [campaignId],
  )
  if (rows[0]?.id) {
    return rows[0].id
  }

  const now = nowISO()
  return runCampaignWrite(() => createStarterNote(db, campaignId, now))
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(async () => {
    const currentRows = await db.select<CampaignRow[]>(
      `SELECT ${CAMPAIGN_COLUMNS} FROM campaigns WHERE id = ?`,
      [campaignId],
    )
    const current = currentRows[0]
    if (!current) throw new Error(`Campaign not found: ${campaignId}`)

    await db.execute(
      `UPDATE campaigns
       SET name = ?, description = ?, accent_color = ?, cover_asset_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.name ?? current.name,
        input.description ?? current.description,
        input.accentColor ?? current.accent_color,
        input.coverAssetId === undefined ? current.cover_asset_id : input.coverAssetId,
        nowISO(),
        campaignId,
      ],
    )
  })
}

export async function setCampaignCover(
  campaignId: string,
  assetId: string | null,
): Promise<void> {
  const now = nowISO()
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute('UPDATE campaigns SET cover_asset_id = ?, updated_at = ? WHERE id = ?', [
      assetId,
      now,
      campaignId,
    ]),
  )
}

export async function markCampaignOpened(campaignId: string): Promise<void> {
  const now = nowISO()
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute('UPDATE campaigns SET last_opened_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      campaignId,
    ]),
  )
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(() => db.execute('DELETE FROM campaigns WHERE id = ?', [campaignId]))
}

export async function listCampaignNodes(campaignId: string): Promise<CampaignNode[]> {
  const db = await getDb()
  const rows = await db.select<CampaignNodeRow[]>(
    `SELECT ${NODE_COLUMNS}
     FROM campaign_nodes
     WHERE campaign_id = ?
     ORDER BY parent_id IS NOT NULL, parent_id ASC, sort_order ASC, title ASC`,
    [campaignId],
  )
  return rows.map(mapNode)
}

export async function createCampaignNode(input: CreateNodeInput): Promise<string> {
  const id = `campaign-node-${crypto.randomUUID()}`
  const now = nowISO()
  const db = await getDb()
  const parentRows = input.parentId
    ? await db.select<CampaignNodeRow[]>(
        `SELECT ${NODE_COLUMNS} FROM campaign_nodes WHERE campaign_id = ? AND id = ?`,
        [input.campaignId, input.parentId],
      )
    : []
  const parent = parentRows[0]
  if (input.parentId && !parent) throw new Error(`Campaign parent node not found: ${input.parentId}`)

  const bucket = nodeBucket(input.kind, parent ? mapNode(parent) : undefined)
  const sortRows = await db.select<Array<{ next_sort_order: number | null }>>(
    `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order
     FROM campaign_nodes
     WHERE campaign_id = ? AND parent_id IS ?`,
    [input.campaignId, input.parentId],
  )
  const sortOrder = sortRows[0]?.next_sort_order ?? 0

  return runCampaignBatch(async () => {
    await db.execute(
      `INSERT INTO campaign_nodes (${NODE_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.campaignId,
        input.parentId,
        input.kind,
        bucket,
        input.title,
        sortOrder,
        0,
        now,
        now,
      ],
    )

    if (input.kind === 'table') {
      const table = defaultTable(now)
      await db.execute(
        `INSERT INTO campaign_tables (${TABLE_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          JSON.stringify(table.columns),
          JSON.stringify(table.rows),
          JSON.stringify(table.cells),
          JSON.stringify(table.columnSizes),
          JSON.stringify(table.rowSizes),
          table.updatedAt,
        ],
      )
    } else if (input.kind !== 'folder') {
      await db.execute(
        `INSERT INTO campaign_documents (${DOCUMENT_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, '', '{}', null, '[]', now],
      )
    }

    return id
  })
}

export async function updateCampaignNodeTitle(nodeId: string, title: string): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute('UPDATE campaign_nodes SET title = ?, updated_at = ? WHERE id = ?', [
      title,
      nowISO(),
      nodeId,
    ]),
  )
}

export async function deleteCampaignNode(nodeId: string): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute('DELETE FROM campaign_nodes WHERE id = ? AND is_system = 0', [nodeId]),
  )
}

export async function getCampaignDocument(nodeId: string): Promise<CampaignDocument | null> {
  const db = await getDb()
  const rows = await db.select<CampaignDocumentRow[]>(
    `SELECT ${DOCUMENT_COLUMNS} FROM campaign_documents WHERE node_id = ?`,
    [nodeId],
  )
  return rows[0] ? mapDocument(rows[0]) : null
}

export async function ensureCampaignDocument(nodeId: string): Promise<CampaignDocument> {
  const existing = await getCampaignDocument(nodeId)
  if (existing) {
    return existing
  }

  const db = await getDb()
  const now = nowISO()
  await runCampaignWrite(() =>
    db.execute(
      `INSERT OR IGNORE INTO campaign_documents (${DOCUMENT_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nodeId, '', '{}', null, '[]', now],
    ),
  )

  const document = await getCampaignDocument(nodeId)
  if (!document) {
    throw new Error(`Campaign document not found: ${nodeId}`)
  }

  return document
}

export async function updateCampaignDocument(
  nodeId: string,
  input: UpdateCampaignDocumentInput,
): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(async () => {
    const current = await getCampaignDocument(nodeId)
    if (!current) throw new Error(`Campaign document not found: ${nodeId}`)

    await db.execute(
      `UPDATE campaign_documents
       SET markdown = ?, profile_json = ?, cover_asset_id = ?, linked_db_refs_json = ?, updated_at = ?
       WHERE node_id = ?`,
      [
        input.markdown ?? current.markdown,
        input.profileJson ?? current.profileJson,
        input.coverAssetId === undefined ? current.coverAssetId : input.coverAssetId,
        input.linkedDbRefsJson ?? current.linkedDbRefsJson,
        nowISO(),
        nodeId,
      ],
    )
  })
}

export async function setCampaignDocumentCover(
  nodeId: string,
  assetId: string | null,
): Promise<void> {
  const now = nowISO()
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute(
      'UPDATE campaign_documents SET cover_asset_id = ?, updated_at = ? WHERE node_id = ?',
      [assetId, now, nodeId],
    ),
  )
}

export async function getCampaignTable(nodeId: string): Promise<CampaignTable | null> {
  const db = await getDb()
  const rows = await db.select<CampaignTableRowRecord[]>(
    `SELECT ${TABLE_COLUMNS} FROM campaign_tables WHERE node_id = ?`,
    [nodeId],
  )
  return rows[0] ? mapTable(rows[0]) : null
}

export async function ensureCampaignTable(nodeId: string): Promise<CampaignTable> {
  const existing = await getCampaignTable(nodeId)
  if (existing) {
    return existing
  }

  const db = await getDb()
  const table = defaultTable(nowISO())
  await runCampaignWrite(() =>
    db.execute(
      `INSERT OR IGNORE INTO campaign_tables (${TABLE_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nodeId,
        JSON.stringify(table.columns),
        JSON.stringify(table.rows),
        JSON.stringify(table.cells),
        JSON.stringify(table.columnSizes),
        JSON.stringify(table.rowSizes),
        table.updatedAt,
      ],
    ),
  )

  const created = await getCampaignTable(nodeId)
  if (!created) {
    throw new Error(`Campaign table not found: ${nodeId}`)
  }

  return created
}

export async function updateCampaignTable(
  nodeId: string,
  input: UpdateCampaignTableInput,
): Promise<void> {
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute(
      `UPDATE campaign_tables
       SET columns_json = ?, rows_json = ?, cells_json = ?, column_sizes_json = ?, row_sizes_json = ?, updated_at = ?
       WHERE node_id = ?`,
      [
        JSON.stringify(input.columns),
        JSON.stringify(input.rows),
        JSON.stringify(input.cells),
        JSON.stringify(input.columnSizes),
        JSON.stringify(input.rowSizes),
        nowISO(),
        nodeId,
      ],
    ),
  )
}

export async function replaceCampaignLinks(
  campaignId: string,
  sourceNodeId: string,
  links: ReplaceCampaignLinkInput[],
): Promise<void> {
  const now = nowISO()
  const db = await getDb()

  await runCampaignBatch(async () => {
    await db.execute(
      'DELETE FROM campaign_links WHERE campaign_id = ? AND source_node_id = ?',
      [campaignId, sourceNodeId],
    )

    for (const link of links) {
      await db.execute(
        `INSERT OR IGNORE INTO campaign_links (${LINK_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `campaign-link-${crypto.randomUUID()}`,
          campaignId,
          sourceNodeId,
          link.targetNodeId,
          link.sourceKind,
          link.label,
          link.createdFrom,
          now,
        ],
      )
    }
  })
}

export async function listCampaignLinks(campaignId: string): Promise<CampaignLink[]> {
  const db = await getDb()
  const rows = await db.select<CampaignLinkRow[]>(
    `SELECT ${LINK_COLUMNS}
     FROM campaign_links
     WHERE campaign_id = ?
     ORDER BY created_at ASC`,
    [campaignId],
  )
  return rows.map(mapLink)
}

export async function listCampaignPins(campaignId: string): Promise<CampaignPin[]> {
  const db = await getDb()
  const rows = await db.select<CampaignPinRow[]>(
    `SELECT ${PIN_COLUMNS}
     FROM campaign_pins
     WHERE campaign_id = ?
     ORDER BY sort_order ASC`,
    [campaignId],
  )
  return rows.map(mapPin)
}

export async function setCampaignPins(campaignId: string, nodeIds: string[]): Promise<void> {
  const now = nowISO()
  const db = await getDb()

  await runCampaignBatch(async () => {
    await db.execute('DELETE FROM campaign_pins WHERE campaign_id = ?', [campaignId])

    for (const [sortOrder, nodeId] of nodeIds.entries()) {
      await db.execute(
        `INSERT INTO campaign_pins (${PIN_COLUMNS}) VALUES (?, ?, ?, ?)`,
        [campaignId, nodeId, sortOrder, now],
      )
    }
  })
}

export async function createCampaignAsset(input: CreateCampaignAssetInput): Promise<string> {
  const id = input.id ?? `campaign-asset-${crypto.randomUUID()}`
  const db = await getDb()
  await runCampaignWrite(() =>
    db.execute(
      `INSERT INTO campaign_assets (${ASSET_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.campaignId,
        input.kind,
        input.fileName,
        input.mimeType,
        input.relativePath,
        nowISO(),
      ],
    ),
  )
  return id
}

export async function getCampaignAsset(assetId: string): Promise<CampaignAsset | null> {
  const db = await getDb()
  const rows = await db.select<CampaignAssetRow[]>(
    `SELECT ${ASSET_COLUMNS} FROM campaign_assets WHERE id = ?`,
    [assetId],
  )
  return rows[0] ? mapAsset(rows[0]) : null
}
