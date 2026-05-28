import { Plus } from 'lucide-react'
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  nodesByTitle,
  parseCampaignWikiLinks,
  type CampaignNode,
  type CampaignTable,
  type CampaignTableColumn,
  type CampaignTableRow,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useCampaignManagerStore } from '../model/store'

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
  onRowTitleChange: (rowId: string, title: string) => void
  onRowResizeStart: (rowId: string, clientY: number) => void
  onStartCellEdit: (cellId: string) => void
  onStopCellEdit: () => void
  onOpenNode: (nodeId: string) => void
}

interface TableBodyCellProps {
  row: CampaignTableRow
  column: CampaignTableColumn
  value: string
  width: number
  titleMap: ReadonlyMap<string, CampaignNode>
  editingCellId: string | null
  onCellChange: (rowId: string, columnId: string, value: string) => void
  onStartCellEdit: (cellId: string) => void
  onStopCellEdit: () => void
  onOpenNode: (nodeId: string) => void
}

interface TableCellPart {
  kind: 'text' | 'link'
  key: string
  text: string
  raw?: string
  node?: CampaignNode | null
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
  onStartCellEdit,
  onStopCellEdit,
  onOpenNode,
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
                    event.stopPropagation()
                    if (part.node) {
                      onOpenNode(part.node.id)
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
  onRowTitleChange,
  onRowResizeStart,
  onStartCellEdit,
  onStopCellEdit,
  onOpenNode,
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
            onStartCellEdit={onStartCellEdit}
            onStopCellEdit={onStopCellEdit}
            onOpenNode={onOpenNode}
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
    previous.onStartCellEdit === next.onStartCellEdit &&
    previous.onStopCellEdit === next.onStopCellEdit &&
    previous.onOpenNode === next.onOpenNode
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
    previous.onRowTitleChange === next.onRowTitleChange &&
    previous.onRowResizeStart === next.onRowResizeStart &&
    previous.onStartCellEdit === next.onStartCellEdit &&
    previous.onStopCellEdit === next.onStopCellEdit &&
    previous.onOpenNode === next.onOpenNode &&
    previous.titleMap === next.titleMap &&
    columnsAreEqual(previous.columns, next.columns) &&
    columnSizesAreEqual(next.columns, previous.columnSizes, next.columnSizes) &&
    rowCellsAreEqual(next.columns, previous.rowCells, next.rowCells)
  )
}

export function TableFileEditor({ node, table }: TableFileEditorProps) {
  const latestTableRef = useRef(table)
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const { patchTable, nodes, openNode } = useCampaignManagerStore(
    useShallow((state) => ({
      patchTable: state.patchTable,
      nodes: state.nodes,
      openNode: state.openNode,
    })),
  )
  const titleMap = useMemo(() => nodesByTitle(nodes), [nodes])

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
    setEditingCellId(cellId)
  }, [])

  const handleStopCellEdit = useCallback(() => {
    setEditingCellId(null)
  }, [])

  const handleOpenNode = useCallback(
    (nodeId: string) => {
      if (findNodeById(nodes, nodeId)) {
        void openNode(nodeId)
      }
    },
    [nodes, openNode],
  )

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
                onRowTitleChange={setRowTitle}
                onRowResizeStart={startRowResize}
                onStartCellEdit={handleStartCellEdit}
                onStopCellEdit={handleStopCellEdit}
                onOpenNode={handleOpenNode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
