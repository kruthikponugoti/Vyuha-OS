"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveRecord } from "@/app/(app)/actions";
import { toast } from "sonner";
import type { FieldDef } from "./types";
import type { TableName } from "@/lib/types";

export function RecordForm({
  open,
  onOpenChange,
  table,
  fields,
  entityName,
  revalidate,
  editing,
  serialize,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: TableName;
  fields: FieldDef[];
  entityName: string;
  revalidate: string;
  editing?: Record<string, any> | null;
  serialize?: (values: Record<string, any>) => Record<string, any>;
  onSaved?: () => void;
}) {
  const [values, setValues] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const init: Record<string, any> = {};
    for (const f of fields) {
      init[f.name] = editing?.[f.name] ?? f.defaultValue ?? "";
    }
    setValues(init);
  }, [open, editing, fields]);

  const set = (name: string, v: any) => setValues((p) => ({ ...p, [name]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? "").trim()) {
        toast.error(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    const payload = serialize ? serialize(values) : values;
    if (editing?.id) payload.id = editing.id;
    const res = await saveRecord(table, payload, revalidate);
    setSaving(false);
    if (res.ok) {
      toast.success(`${entityName[0].toUpperCase()}${entityName.slice(1)} ${editing ? "updated" : "added"}.`);
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(res.error ?? "Save failed.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} {entityName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.name} className="mb-1.5 block">
                {f.label}
                {f.required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea id={f.name} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === "select" ? (
                <Select value={String(values[f.name] ?? "")} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type ?? "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, f.type === "number" ? e.target.value : e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
              {f.help && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
            </div>
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : `Add ${entityName}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
