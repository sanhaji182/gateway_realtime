// File ini membungkus TanStack Table untuk tabel data-dense dashboard. Dipakai oleh halaman Apps, Connections, Events, Webhooks, dan Settings.
"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// DataTableColumn menambahkan meta mono untuk kolom teknis seperti ID, IP, hash, dan request id.
export type DataTableColumn<TData> = ColumnDef<TData> & { meta?: { mono?: boolean } };

// DataTable merender tabel TanStack generik. data dan columns datang dari halaman, sementara onRowClick membuka drawer/detail sesuai konteks halaman.
export function DataTable<TData>({ columns, data, onRowClick, className }: { columns: DataTableColumn<TData>[]; data: TData[]; onRowClick?: (row: TData) => void; className?: string }) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table intentionally incompatible with React Compiler memoization rules
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className={cn("overflow-auto rounded-md border bg-surface1", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface2 text-xs uppercase tracking-[0.04em] text-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="h-10 whitespace-nowrap px-4 font-medium">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={cn("h-10 border-b transition-colors last:border-b-0", index % 2 === 1 && "bg-white/[0.02]", onRowClick && "cursor-pointer hover:bg-white/[0.04]")}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} title={String(cell.getValue() ?? "")} className={cn("max-w-[240px] truncate px-4 text-secondary", (cell.column.columnDef.meta as { mono?: boolean } | undefined)?.mono && "mono text-xs text-primary")}>
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
