"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RecordForm } from "./record-form";
import { EmptyState } from "@/components/shell/empty-state";
import { deleteRecord, importRecords, restoreRecord } from "@/app/(app)/actions";
import { exportCsv, parseCsv } from "@/lib/csv";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Search, Plus, Download, Upload, MoreHorizontal, Pencil, Trash2, Inbox } from "lucide-react";
import type { CrudTableProps } from "./types";

export function CrudTable<T extends { id: string }>({
  table,
  rows,
  columns,
  fields,
  searchKeys,
  filters = [],
  entityName,
  revalidate,
  canWrite,
  rowHref,
  exportName,
  serialize,
}: CrudTableProps<T>) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filterVals, setFilterVals] = React.useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Record<string, any> | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const hit = searchKeys.some((k) => String((row as any)[k] ?? "").toLowerCase().includes(q));
        if (!hit) return false;
      }
      for (const [key, val] of Object.entries(filterVals)) {
        if (val && val !== "__all" && String((row as any)[key] ?? "") !== val) return false;
      }
      return true;
    });
  }, [rows, query, filterVals, searchKeys]);

  async function onDelete(id: string) {
    const res = await deleteRecord(table, id, revalidate);
    if (res.ok) {
      const snapshot = res.deleted;
      toast.success(`${entityName[0].toUpperCase()}${entityName.slice(1)} deleted.`, {
        action: snapshot
          ? {
              label: "Undo",
              onClick: async () => {
                const r = await restoreRecord(table, snapshot, revalidate);
                if (r.ok) { toast.success(`${entityName[0].toUpperCase()}${entityName.slice(1)} restored.`); router.refresh(); }
                else toast.error(r.error ?? "Couldn't undo.");
              },
            }
          : undefined,
      });
      router.refresh();
    } else {
      toast.error(res.error ?? "Delete failed.");
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseCsv(file);
      const clean = parsed.map((r) => (serialize ? serialize(r) : r));
      const res = await importRecords(table, clean, revalidate);
      if (res.ok) {
        toast.success(`Imported ${res.count} ${entityName}${res.count === 1 ? "" : "s"}.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Import failed.");
      }
    } catch {
      toast.error("Couldn't read that CSV.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${entityName}s…`} className="pl-8" />
          </div>
          {filters.map((f) => (
            <Select key={f.key} value={filterVals[f.key] ?? "__all"} onValueChange={(v) => setFilterVals((p) => ({ ...p, [f.key]: v }))}>
              <SelectTrigger className="w-auto min-w-[130px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All {f.label.toLowerCase()}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(exportName ?? entityName, filtered as any)}>
            <Download className="h-4 w-4" /> Export
          </Button>
          {canWrite && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="sr-only" onChange={onImport} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Import
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4" /> New {entityName}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-card border border-border bg-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title={query || Object.values(filterVals).some((v) => v && v !== "__all") ? `No ${entityName}s match` : `No ${entityName}s yet`}
            description={
              query
                ? "Try a different search or filter."
                : canWrite
                  ? `Add your first ${entityName} to get started.`
                  : `No ${entityName}s to show.`
            }
            action={canWrite && !query ? <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New {entityName}</Button> : undefined}
            className="border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
                ))}
                {canWrite && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(rowHref && "cursor-pointer")}
                  onClick={rowHref ? () => router.push(rowHref(row)) : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : String((row as any)[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { setEditing(row as any); setFormOpen(true); }}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(row.id)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} of {rows.length} {entityName}{rows.length === 1 ? "" : "s"}</span>
      </div>

      <RecordForm
        open={formOpen}
        onOpenChange={setFormOpen}
        table={table}
        fields={fields}
        entityName={entityName}
        revalidate={revalidate}
        editing={editing}
        serialize={serialize}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
