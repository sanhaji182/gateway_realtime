"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export type DataTableColumn<TData> = ColumnDef<TData> & { meta?: { mono?: boolean } };

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  className,
}: {
  columns: DataTableColumn<TData>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  className?: string;
}) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className={cn("overflow-auto rounded border bg-surface shadow-sm", className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b">
              {hg.headers.map((h) => (
                <th key={h.id} className="h-8 whitespace-nowrap px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "h-9 border-b transition-colors last:border-b-0",
                onRowClick && "cursor-pointer hover:bg-hover"
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "max-w-[240px] truncate px-3 text-[13px] text-secondary",
                    (cell.column.columnDef.meta as { mono?: boolean } | undefined)?.mono && "mono text-primary"
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
