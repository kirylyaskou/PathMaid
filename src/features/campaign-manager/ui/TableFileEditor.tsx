import { Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { CampaignNode, CampaignTable, CampaignTableColumn, CampaignTableRow } from '@/entities/campaign'
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
  onCellChange: (rowId: string, columnId: string, value: string) => void
  onRowTitleChange: (rowId: string, title: string) => void
  onRowResizeStart: (rowId: string, clientY: number) => void
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

const TableBodyRow = memo(function TableBodyRow({
  row,
  columns,
  rowCells,
  rowHeight,
  columnSizes,
  onCellChange,
  onRowTitleChange,
  onRowResizeStart,
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
          <td
            key={column.id}
            className="border-r border-border/50 p-1 align-middle"
            style={{ width, minWidth: width }}
          >
            <Input
              value={rowCells[column.id] ?? ''}
              onChange={(event) => onCellChange(row.id, column.id, event.target.value)}
              aria-label={`${row.title} ${column.title}`}
              className="h-8 border-transparent bg-transparent px-2 text-sm shadow-none focus-visible:border-ring"
            />
          </td>
        )
      })}
    </tr>
  )
}, areBodyRowPropsEqual)

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
    previous.onCellChange === next.onCellChange &&
    previous.onRowTitleChange === next.onRowTitleChange &&
    previous.onRowResizeStart === next.onRowResizeStart &&
    columnsAreEqual(previous.columns, next.columns) &&
    columnSizesAreEqual(next.columns, previous.columnSizes, next.columnSizes) &&
    rowCellsAreEqual(next.columns, previous.rowCells, next.rowCells)
  )
}

export function TableFileEditor({ node, table }: TableFileEditorProps) {
  const latestTableRef = useRef(table)
  const { patchTable } = useCampaignManagerStore(
    useShallow((state) => ({
      patchTable: state.patchTable,
    })),
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
                onCellChange={setCell}
                onRowTitleChange={setRowTitle}
                onRowResizeStart={startRowResize}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
