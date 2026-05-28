import { Plus } from 'lucide-react'
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  bucketForLinkedKind,
  campaignLinkGuesses,
  findNodeById,
  formatCampaignWikiLink,
  linkTitleFromSelection,
  nodesByTitle,
  parseCampaignWikiLinks,
  topLevelBucketNode,
  type CampaignNode,
  type CampaignTable,
  type CampaignTableColumn,
  type CampaignTableRow,
  type LinkableCampaignNodeKind,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useCampaignManagerStore } from '../model/store'
import { SelectionActionMenu } from './SelectionActionMenu'
import { WikiLinkFormulaEditor } from './WikiLinkFormulaEditor'

const DEFAULT_COLUMN_WIDTH = 160
const DEFAULT_ROW_HEIGHT = 36
const MIN_COLUMN_WIDTH = 96
const MIN_ROW_HEIGHT = 28
const ROW_HEADER_WIDTH = 180

interface TableFileEditorProps {
  node: CampaignNode
  table: CampaignTable
}

interface TableHeaderRowProps {
  columns: CampaignTableColumn[]
  columnSizes: Record<string, number>
  onColumnTitleChange: (columnId: string, title: string) => void
  onColumnResizeStart: (columnId: string, clientX: number) => void
}

interface TableBodyRowProps {
  row: CampaignTableRow
  columns: CampaignTableColumn[]
  rowCells: Record<string, string>
  rowHeight: number
  columnSizes: Record<string, number>
  titleMap: ReadonlyMap<string, CampaignNode>
  editingCellId: string | null
  onCellChange: (rowId: string, columnId: string, value: string) => void
  onCellSelect: (rowId: string, columnId: string, input: HTMLInputElement) => void
  onRowTitleChange: (rowId: string, title: string) => void
  onRowResizeStart: (rowId: string, clientY: number) => void
  onStartCellEdit: (cellId: string) => void
  onStopCellEdit: () => void
  onEditLink: (rowId: string, columnId: string, part: TableCellLinkPart) => void
}

interface TableBodyCellProps {
  row: CampaignTableRow
  column: CampaignTableColumn
  value: string
  width: number
  titleMap: ReadonlyMap<string, CampaignNode>
  editingCellId: string | null
  onCellChange: (rowId: string, columnId: string, value: string) => void
  onCellSelect: (rowId: string, columnId: string, input: HTMLInputElement) => void
  onStartCellEdit: (cellId: string) => void
  onStopCellEdit: () => void
  onEditLink: (rowId: string, columnId: string, part: TableCellLinkPart) => void
}

interface TableCellTextPart {
  kind: 'text'
  key: string
  text: string
}

interface TableCellLinkPart {
  kind: 'link'
  key: string
  text: string
  start: number
  end: number
  raw: string
  node?: CampaignNode | null
}

type TableCellPart = TableCellTextPart | TableCellLinkPart

interface ActiveTableLink {
  rowId: string
  columnId: string
  start: number
  end: number
  raw: string
}

interface ActiveTableSelection {
  rowId: string
  columnId: string
  start: number
  end: number
  text: string
}

function emptyTableSelection(): ActiveTableSelection {
  return { rowId: '', columnId: '', start: 0, end: 0, text: '' }
}

function columnsAreEqual(previous: CampaignTableColumn[], next: CampaignTableColumn[]): boolean {
  return (
    previous.length === next.length &&
    previous.every((column, index) => {
      const nextColumn = next[index]
      return nextColumn?.id === column.id && nextColumn.title === column.title
    })
  )
}

function columnSizesAreEqual(
  columns: CampaignTableColumn[],
  previous: Record<string, number>,
  next: Record<string, number>,
): boolean {
  return columns.every(
    (column) =>
      (previous[column.id] ?? DEFAULT_COLUMN_WIDTH) === (next[column.id] ?? DEFAULT_COLUMN_WIDTH),
  )
}

function rowCellsAreEqual(
  columns: CampaignTableColumn[],
  previous: Record<string, string>,
  next: Record<string, string>,
): boolean {
  return columns.every((column) => (previous[column.id] ?? '') === (next[column.id] ?? ''))
}

function tableCellId(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`
}

function parseTableCellParts(
  value: string,
  titleMap: ReadonlyMap<string, CampaignNode>,
): TableCellPart[] {
  const parts: TableCellPart[] = []
  let cursor = 0

  for (const link of parseCampaignWikiLinks(value)) {
    const start = value.indexOf(link.raw, cursor)
    if (start < 0) {
      continue
    }

    if (start > cursor) {
      parts.push({
        kind: 'text',
        key: `text-${cursor}`,
        text: value.slice(cursor, start),
      })
    }

    parts.push({
      kind: 'link',
      key: `link-${start}-${link.targetTitle}`,
      text: link.label,
      start,
      end: start + link.raw.length,
      raw: link.raw,
      node: titleMap.get(link.targetTitle.toLocaleLowerCase()) ?? null,
    })
    cursor = start + link.raw.length
  }

  if (cursor < value.length) {
    parts.push({
      kind: 'text',
      key: `text-${cursor}`,
      text: value.slice(cursor),
    })
  }

  return parts
}

const TableHeaderRow = memo(function TableHeaderRow({
  columns,
  columnSizes,
  onColumnTitleChange,
  onColumnResizeStart,
}: TableHeaderRowProps) {
  return (
    <tr className="border-b border-border/70">
      <th
        className="sticky left-0 top-0 z-30 border-r border-border/70 bg-muted/80 px-2 py-2 text-left text-xs font-medium text-muted-foreground backdrop-blur"
        style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
      >
        Row
      </th>
      {columns.map((column) => {
        const width = columnSizes[column.id] ?? DEFAULT_COLUMN_WIDTH

        return (
          <th
            key={column.id}
            className="sticky top-0 z-20 border-r border-border/70 bg-muted/80 p-2 backdrop-blur"
            style={{ width, minWidth: width }}
          >
            <div className="relative flex items-center">
              <Input
                value={column.title}
                onChange={(event) => onColumnTitleChange(column.id, event.target.value)}
                aria-label={`Column title ${column.title}`}
                className="h-8 border-transparent bg-transparent px-2 text-sm font-medium shadow-none focus-visible:border-ring"
              />
              <button
                type="button"
                aria-label={`Resize ${column.title}`}
                className="absolute -right-2 top-0 h-8 w-3 cursor-col-resize rounded-sm hover:bg-primary/30 focus-visible:bg-primary/30 focus-visible:outline-none"
                onMouseDown={(event) => {
                  event.preventDefault()
                  onColumnResizeStart(column.id, event.clientX)
                }}
              />
            </div>
          </th>
        )
      })}
    </tr>
  )
}, areHeaderPropsEqual)

const TableBodyCell = memo(function TableBodyCell({
  row,
  column,
  value,
  width,
  titleMap,
  editingCellId,
  onCellChange,
  onCellSelect,
  onStartCellEdit,
  onStopCellEdit,
  onEditLink,
}: TableBodyCellProps) {
  const cellId = tableCellId(row.id, column.id)
  const cellParts = parseTableCellParts(value, titleMap)
  const hasLinks = cellParts.some((part) => part.kind === 'link')
  const editing = editingCellId === cellId || !hasLinks

  return (
    <td className="border-r border-border/50 p-1 align-middle" style={{ width, minWidth: width }}>
      {editing ? (
        <Input
          value={value}
          onChange={(event) => onCellChange(row.id, column.id, event.target.value)}
          onSelect={(event) => onCellSelect(row.id, column.id, event.currentTarget)}
          onMouseUp={(event) => onCellSelect(row.id, column.id, event.currentTarget)}
          onKeyUp={(event) => onCellSelect(row.id, column.id, event.currentTarget)}
          onBlur={onStopCellEdit}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          aria-label={`${row.title} ${column.title}`}
          className="h-8 border-transparent bg-transparent px-2 text-sm shadow-none focus-visible:border-ring"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          className="flex min-h-8 items-center overflow-hidden rounded-md px-2 text-sm"
          onDoubleClick={() => onStartCellEdit(cellId)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'F2') {
              event.preventDefault()
              onStartCellEdit(cellId)
            }
          }}
        >
          <span className="truncate">
            {cellParts.map((part) => {
              if (part.kind === 'text') {
                return <Fragment key={part.key}>{part.text}</Fragment>
              }

              return (
                <button
                  key={part.key}
                  type="button"
                  title={part.raw}
                  aria-disabled={!part.node}
                  className={cn(
                    'inline rounded-sm px-0.5 text-amber-300 underline decoration-amber-400 underline-offset-4 hover:bg-amber-400/10',
                    !part.node && 'cursor-default text-amber-300/60 decoration-amber-400/40',
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onEditLink(row.id, column.id, part)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onEditLink(row.id, column.id, part)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'F2') {
                      event.preventDefault()
                      onEditLink(row.id, column.id, part)
                    }
                  }}
                >
                  {part.text}
                </button>
              )
            })}
          </span>
        </div>
      )}
    </td>
  )
}, areBodyCellPropsEqual)

const TableBodyRow = memo(function TableBodyRow({
  row,
  columns,
  rowCells,
  rowHeight,
  columnSizes,
  titleMap,
  editingCellId,
  onCellChange,
  onCellSelect,
  onRowTitleChange,
  onRowResizeStart,
  onStartCellEdit,
  onStopCellEdit,
  onEditLink,
}: TableBodyRowProps) {
  return (
    <tr className="border-b border-border/50" style={{ height: rowHeight }}>
      <th
        className="sticky left-0 z-10 border-r border-border/70 bg-background p-1 text-left align-middle shadow-[1px_0_0_hsl(var(--border))]"
        style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
      >
        <div className="relative">
          <Input
            value={row.title}
            onChange={(event) => onRowTitleChange(row.id, event.target.value)}
            aria-label={`Row title ${row.title}`}
            className="h-8 border-transparent bg-transparent px-2 text-sm font-medium shadow-none focus-visible:border-ring"
          />
          <button
            type="button"
            aria-label={`Resize ${row.title}`}
            className="absolute -bottom-1 left-0 h-2 w-full cursor-row-resize rounded-sm hover:bg-primary/30 focus-visible:bg-primary/30 focus-visible:outline-none"
            onMouseDown={(event) => {
              event.preventDefault()
              onRowResizeStart(row.id, event.clientY)
            }}
          />
        </div>
      </th>
      {columns.map((column) => {
        const width = columnSizes[column.id] ?? DEFAULT_COLUMN_WIDTH

        return (
          <TableBodyCell
            key={column.id}
            row={row}
            column={column}
            value={rowCells[column.id] ?? ''}
            width={width}
            titleMap={titleMap}
            editingCellId={editingCellId}
            onCellChange={onCellChange}
            onCellSelect={onCellSelect}
            onStartCellEdit={onStartCellEdit}
            onStopCellEdit={onStopCellEdit}
            onEditLink={onEditLink}
          />
        )
      })}
    </tr>
  )
}, areBodyRowPropsEqual)

function areBodyCellPropsEqual(previous: TableBodyCellProps, next: TableBodyCellProps): boolean {
  return (
    previous.row.id === next.row.id &&
    previous.row.title === next.row.title &&
    previous.column.id === next.column.id &&
    previous.column.title === next.column.title &&
    previous.value === next.value &&
    previous.width === next.width &&
    previous.titleMap === next.titleMap &&
    previous.editingCellId === next.editingCellId &&
    previous.onCellChange === next.onCellChange &&
    previous.onCellSelect === next.onCellSelect &&
    previous.onStartCellEdit === next.onStartCellEdit &&
    previous.onStopCellEdit === next.onStopCellEdit &&
    previous.onEditLink === next.onEditLink
  )
}

function areHeaderPropsEqual(previous: TableHeaderRowProps, next: TableHeaderRowProps): boolean {
  return (
    previous.onColumnTitleChange === next.onColumnTitleChange &&
    previous.onColumnResizeStart === next.onColumnResizeStart &&
    columnsAreEqual(previous.columns, next.columns) &&
    columnSizesAreEqual(next.columns, previous.columnSizes, next.columnSizes)
  )
}

function areBodyRowPropsEqual(previous: TableBodyRowProps, next: TableBodyRowProps): boolean {
  return (
    previous.row.id === next.row.id &&
    previous.row.title === next.row.title &&
    previous.rowHeight === next.rowHeight &&
    previous.editingCellId === next.editingCellId &&
    previous.onCellChange === next.onCellChange &&
    previous.onCellSelect === next.onCellSelect &&
    previous.onRowTitleChange === next.onRowTitleChange &&
    previous.onRowResizeStart === next.onRowResizeStart &&
    previous.onStartCellEdit === next.onStartCellEdit &&
    previous.onStopCellEdit === next.onStopCellEdit &&
    previous.onEditLink === next.onEditLink &&
    previous.titleMap === next.titleMap &&
    columnsAreEqual(previous.columns, next.columns) &&
    columnSizesAreEqual(next.columns, previous.columnSizes, next.columnSizes) &&
    rowCellsAreEqual(next.columns, previous.rowCells, next.rowCells)
  )
}

export function TableFileEditor({ node, table }: TableFileEditorProps) {
  const latestTableRef = useRef(table)
  const isCreatePendingRef = useRef(false)
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<ActiveTableLink | null>(null)
  const [selection, setSelection] = useState<ActiveTableSelection>(emptyTableSelection())
  const [formulaDraft, setFormulaDraft] = useState('')
  const [isCreatePending, setIsCreatePending] = useState(false)
  const { patchTable, createNode, nodes, links } = useCampaignManagerStore(
    useShallow((state) => ({
      patchTable: state.patchTable,
      createNode: state.createNode,
      nodes: state.nodes,
      links: state.links,
    })),
  )
  const titleMap = useMemo(() => nodesByTitle(nodes), [nodes])
  const formulaGuesses = useMemo(
    () => (editingLink ? campaignLinkGuesses(node, nodes, links, formulaDraft) : []),
    [editingLink, formulaDraft, links, node, nodes],
  )

  useEffect(() => {
    latestTableRef.current = table
  }, [table])

  const addColumn = useCallback(() => {
    const id = `col-${crypto.randomUUID()}`

    patchTable(node.id, {
      ...table,
      columns: [...table.columns, { id, title: `Column ${table.columns.length + 1}` }],
      columnSizes: {
        ...table.columnSizes,
        [id]: DEFAULT_COLUMN_WIDTH,
      },
    })
  }, [node.id, patchTable, table])

  const handleStartCellEdit = useCallback((cellId: string) => {
    setEditingLink(null)
    setEditingCellId(cellId)
  }, [])

  const handleStopCellEdit = useCallback(() => {
    setEditingCellId(null)
  }, [])

  const addRow = useCallback(() => {
    const id = `row-${crypto.randomUUID()}`

    patchTable(node.id, {
      ...table,
      rows: [...table.rows, { id, title: `Row ${table.rows.length + 1}` }],
      cells: {
        ...table.cells,
        [id]: {},
      },
      rowSizes: {
        ...table.rowSizes,
        [id]: DEFAULT_ROW_HEIGHT,
      },
    })
  }, [node.id, patchTable, table])

  const setCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      const latestTable = latestTableRef.current
      setEditingLink(null)

      patchTable(node.id, {
        ...latestTable,
        cells: {
          ...latestTable.cells,
          [rowId]: {
            ...(latestTable.cells[rowId] ?? {}),
            [columnId]: value,
          },
        },
      })
    },
    [node.id, patchTable],
  )

  const handleCellSelect = useCallback(
    (rowId: string, columnId: string, input: HTMLInputElement) => {
      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? 0

      if (start === end) {
        setSelection(emptyTableSelection())
        return
      }

      setSelection({
        rowId,
        columnId,
        start: Math.min(start, end),
        end: Math.max(start, end),
        text: input.value.slice(Math.min(start, end), Math.max(start, end)),
      })
    },
    [],
  )

  const replaceSelectedText = useCallback(
    (replacement: string, targetSelection = selection) => {
      if (!targetSelection.rowId || !targetSelection.columnId) {
        return
      }

      const latestTable = latestTableRef.current
      const currentValue = latestTable.cells[targetSelection.rowId]?.[targetSelection.columnId] ?? ''
      const nextValue =
        currentValue.slice(0, targetSelection.start) +
        replacement +
        currentValue.slice(targetSelection.end)

      patchTable(node.id, {
        ...latestTable,
        cells: {
          ...latestTable.cells,
          [targetSelection.rowId]: {
            ...(latestTable.cells[targetSelection.rowId] ?? {}),
            [targetSelection.columnId]: nextValue,
          },
        },
      })
      setSelection(emptyTableSelection())
      setEditingCellId(null)
    },
    [node.id, patchTable, selection],
  )

  const handleLinkSelection = useCallback(() => {
    const title = linkTitleFromSelection(selection.text)
    if (title.length > 0) {
      replaceSelectedText(formatCampaignWikiLink(title))
    }
  }, [replaceSelectedText, selection.text])

  const createLinked = useCallback(
    async (kind: LinkableCampaignNodeKind) => {
      if (isCreatePendingRef.current) {
        return
      }

      const title = linkTitleFromSelection(selection.text)
      if (title.length === 0) {
        return
      }

      const bucket = bucketForLinkedKind(kind, node)
      const parent = topLevelBucketNode(nodes, node.campaignId, bucket)
      const fallbackParent = node.parentId ? findNodeById(nodes, node.parentId) : node

      isCreatePendingRef.current = true
      setIsCreatePending(true)

      try {
        await createNode({
          campaignId: node.campaignId,
          parentId: parent?.id ?? fallbackParent?.id ?? node.id,
          kind,
          bucket,
          title,
          openAfterCreate: false,
        })
        replaceSelectedText(formatCampaignWikiLink(title))
      } catch {
        toast.error('Failed to create campaign file')
      } finally {
        isCreatePendingRef.current = false
        setIsCreatePending(false)
      }
    },
    [createNode, node, nodes, replaceSelectedText, selection.text],
  )

  const handleCreateNote = useCallback(() => {
    void createLinked('note')
  }, [createLinked])

  const handleCreateNpc = useCallback(() => {
    void createLinked('npc')
  }, [createLinked])

  const handleCreateItem = useCallback(() => {
    void createLinked('item')
  }, [createLinked])

  const handleCreateLocation = useCallback(() => {
    void createLinked('location')
  }, [createLinked])

  const handleEditLink = useCallback(
    (rowId: string, columnId: string, part: TableCellLinkPart) => {
      setEditingCellId(null)
      setEditingLink({
        rowId,
        columnId,
        start: part.start,
        end: part.end,
        raw: part.raw,
      })
      setFormulaDraft(part.raw)
    },
    [],
  )

  const replaceEditingLink = useCallback(
    (replacement: string, targetLink: ActiveTableLink) => {
      const latestTable = latestTableRef.current
      const currentValue = latestTable.cells[targetLink.rowId]?.[targetLink.columnId] ?? ''
      const nextValue =
        currentValue.slice(0, targetLink.start) +
        replacement +
        currentValue.slice(targetLink.end)

      patchTable(node.id, {
        ...latestTable,
        cells: {
          ...latestTable.cells,
          [targetLink.rowId]: {
            ...(latestTable.cells[targetLink.rowId] ?? {}),
            [targetLink.columnId]: nextValue,
          },
        },
      })
      setEditingLink(null)
      setFormulaDraft('')
    },
    [node.id, patchTable],
  )

  const handleFormulaCommit = useCallback(() => {
    if (!editingLink || formulaDraft.trim().length === 0) {
      return
    }

    const guessedTitle = formulaGuesses[0]?.title
    replaceEditingLink(guessedTitle ? formatCampaignWikiLink(guessedTitle) : formulaDraft, editingLink)
  }, [editingLink, formulaDraft, formulaGuesses, replaceEditingLink])

  const handleFormulaGuessPick = useCallback(
    (targetNode: CampaignNode) => {
      if (!editingLink) {
        return
      }

      replaceEditingLink(formatCampaignWikiLink(targetNode.title), editingLink)
    },
    [editingLink, replaceEditingLink],
  )

  const setColumnTitle = useCallback(
    (columnId: string, title: string) => {
      patchTable(node.id, {
        ...table,
        columns: table.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column,
        ),
      })
    },
    [node.id, patchTable, table],
  )

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const latestTable = latestTableRef.current

      patchTable(node.id, {
        ...latestTable,
        columnSizes: {
          ...latestTable.columnSizes,
          [columnId]: width,
        },
      })
    },
    [node.id, patchTable],
  )

  const setRowHeight = useCallback(
    (rowId: string, height: number) => {
      const latestTable = latestTableRef.current

      patchTable(node.id, {
        ...latestTable,
        rowSizes: {
          ...latestTable.rowSizes,
          [rowId]: height,
        },
      })
    },
    [node.id, patchTable],
  )

  const setRowTitle = useCallback(
    (rowId: string, title: string) => {
      const latestTable = latestTableRef.current

      patchTable(node.id, {
        ...latestTable,
        rows: latestTable.rows.map((row) => (row.id === rowId ? { ...row, title } : row)),
      })
    },
    [node.id, patchTable],
  )

  const startColumnResize = useCallback(
    (columnId: string, clientX: number) => {
      const startWidth = latestTableRef.current.columnSizes[columnId] ?? DEFAULT_COLUMN_WIDTH

      const handleMouseMove = (event: globalThis.MouseEvent) => {
        setColumnWidth(columnId, Math.max(MIN_COLUMN_WIDTH, startWidth + event.clientX - clientX))
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [setColumnWidth],
  )

  const startRowResize = useCallback(
    (rowId: string, clientY: number) => {
      const startHeight = latestTableRef.current.rowSizes[rowId] ?? DEFAULT_ROW_HEIGHT

      const handleMouseMove = (event: globalThis.MouseEvent) => {
        setRowHeight(rowId, Math.max(MIN_ROW_HEIGHT, startHeight + event.clientY - clientY))
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [setRowHeight],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4" />
          Add column
        </Button>
      </div>
      <SelectionActionMenu
        selectedText={selection.text}
        isPending={isCreatePending}
        onLink={handleLinkSelection}
        onCreateNote={handleCreateNote}
        onCreateNpc={handleCreateNpc}
        onCreateItem={handleCreateItem}
        onCreateLocation={handleCreateLocation}
      />
      {editingLink ? (
        <WikiLinkFormulaEditor
          value={formulaDraft}
          guesses={formulaGuesses}
          onChange={setFormulaDraft}
          onCommit={handleFormulaCommit}
          onPick={handleFormulaGuessPick}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/70 bg-background">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <TableHeaderRow
              columns={table.columns}
              columnSizes={table.columnSizes}
              onColumnTitleChange={setColumnTitle}
              onColumnResizeStart={startColumnResize}
            />
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <TableBodyRow
                key={row.id}
                row={row}
                columns={table.columns}
                rowCells={table.cells[row.id] ?? {}}
                rowHeight={table.rowSizes[row.id] ?? DEFAULT_ROW_HEIGHT}
                columnSizes={table.columnSizes}
                titleMap={titleMap}
                editingCellId={editingCellId}
                onCellChange={setCell}
                onCellSelect={handleCellSelect}
                onRowTitleChange={setRowTitle}
                onRowResizeStart={startRowResize}
                onStartCellEdit={handleStartCellEdit}
                onStopCellEdit={handleStopCellEdit}
                onEditLink={handleEditLink}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
