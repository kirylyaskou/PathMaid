import { Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { CampaignNode, CampaignTable, CampaignTableColumn, CampaignTableRow } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useCampaignManagerStore } from '../model/store'

const DEFAULT_COLUMN_WIDTH = 160
const DEFAULT_ROW_HEIGHT = 36
const MIN_COLUMN_WIDTH = 96
const MIN_ROW_HEIGHT = 28

interface TableFileEditorProps {
  node: CampaignNode
  table: CampaignTable
}

interface TableHeaderRowProps {
  columns: CampaignTableColumn[]
  columnSizes: Record<string, number>
  onColumnTitleChange: (columnId: string, title: string) => void
  onColumnWidthChange: (columnId: string, width: number) => void
}

interface TableBodyRowProps {
  row: CampaignTableRow
  columns: CampaignTableColumn[]
  rowCells: Record<string, string>
  rowHeight: number
  columnSizes: Record<string, number>
  onCellChange: (rowId: string, columnId: string, value: string) => void
  onRowHeightChange: (rowId: string, height: number) => void
}

interface SizeInputProps {
  value: number
  minimum: number
  ariaLabel: string
  className: string
  onCommit: (value: number) => void
}

function parseMinimumNumber(value: string, minimum: number): number | null {
  if (value.trim().length === 0) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : null
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

const SizeInput = memo(function SizeInput({
  value,
  minimum,
  ariaLabel,
  className,
  onCommit,
}: SizeInputProps) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commitDraft = useCallback(() => {
    const nextValue = parseMinimumNumber(draft, minimum)

    if (nextValue === null) {
      setDraft(String(value))
      return
    }

    setDraft(String(nextValue))

    if (nextValue !== value) {
      onCommit(nextValue)
    }
  }, [draft, minimum, onCommit, value])

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitDraft()
      }
    },
    [commitDraft],
  )

  return (
    <Input
      type="number"
      min={minimum}
      value={draft}
      onChange={handleChange}
      onBlur={commitDraft}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className={className}
    />
  )
})

const TableHeaderRow = memo(function TableHeaderRow({
  columns,
  columnSizes,
  onColumnTitleChange,
  onColumnWidthChange,
}: TableHeaderRowProps) {
  return (
    <tr className="border-b border-border/70">
      <th className="sticky left-0 top-0 z-30 w-36 min-w-36 border-r border-border/70 bg-muted/80 px-2 py-2 text-left text-xs font-medium text-muted-foreground backdrop-blur">
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
            <div className="flex items-center gap-2">
              <Input
                value={column.title}
                onChange={(event) => onColumnTitleChange(column.id, event.target.value)}
                aria-label={`Column title ${column.title}`}
                className="h-8 bg-background text-sm font-medium"
              />
              <SizeInput
                value={width}
                minimum={MIN_COLUMN_WIDTH}
                ariaLabel={`Column width ${column.title}`}
                className="h-8 w-20 bg-background px-2 text-right text-xs"
                onCommit={(value) => onColumnWidthChange(column.id, value)}
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
  onRowHeightChange,
}: TableBodyRowProps) {
  return (
    <tr className="border-b border-border/50" style={{ height: rowHeight }}>
      <th className="sticky left-0 z-10 w-36 min-w-36 border-r border-border/70 bg-background p-2 text-left align-middle shadow-[1px_0_0_hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.title}</span>
          <SizeInput
            value={rowHeight}
            minimum={MIN_ROW_HEIGHT}
            ariaLabel={`Row height ${row.title}`}
            className="h-8 w-16 bg-background px-2 text-right text-xs"
            onCommit={(value) => onRowHeightChange(row.id, value)}
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
    previous.onColumnWidthChange === next.onColumnWidthChange &&
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
    previous.onRowHeightChange === next.onRowHeightChange &&
    columnsAreEqual(previous.columns, next.columns) &&
    columnSizesAreEqual(next.columns, previous.columnSizes, next.columnSizes) &&
    rowCellsAreEqual(next.columns, previous.rowCells, next.rowCells)
  )
}

export function TableFileEditor({ node, table }: TableFileEditorProps) {
  const { patchTable } = useCampaignManagerStore(
    useShallow((state) => ({
      patchTable: state.patchTable,
    })),
  )

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
      patchTable(node.id, {
        ...table,
        cells: {
          ...table.cells,
          [rowId]: {
            ...(table.cells[rowId] ?? {}),
            [columnId]: value,
          },
        },
      })
    },
    [node.id, patchTable, table],
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
      patchTable(node.id, {
        ...table,
        columnSizes: {
          ...table.columnSizes,
          [columnId]: width,
        },
      })
    },
    [node.id, patchTable, table],
  )

  const setRowHeight = useCallback(
    (rowId: string, height: number) => {
      patchTable(node.id, {
        ...table,
        rowSizes: {
          ...table.rowSizes,
          [rowId]: height,
        },
      })
    },
    [node.id, patchTable, table],
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
              onColumnWidthChange={setColumnWidth}
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
                onRowHeightChange={setRowHeight}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
