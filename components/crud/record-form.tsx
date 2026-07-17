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
import { cn } from "@/lib/utils";
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
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const init: Record<string, any> = {};
    for (const f of fields) {
      let v = editing?.[f.name] ?? f.defaultValue ?? "";
      // Show a prefixed field (e.g. phone "+91…") without its prefix in the input.
      if (f.prefix && typeof v === "string" && v.startsWith(f.prefix)) v = v.slice(f.prefix.length);
      init[f.name] = v;
    }
    setValues(init);
    setErrors({});
  }, [open, editing, fields]);

  const set = (name: string, v: any) => {
    setValues((p) => ({ ...p, [name]: v }));
    setErrors((p) => (p[name] ? { ...p, [name]: "" } : p));
  };

  function fieldError(f: FieldDef, raw: any): string | null {
    const v = String(raw ?? "").trim();
    if (f.required && !v) return `${f.label} is required.`;
    if (v && f.validate) return f.validate(v);
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const err = fieldError(f, values[f.name]);
      if (err) errs[f.name] = err;
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});

    // Re-apply fixed prefixes (e.g. +91) before saving.
    const applied: Record<string, any> = { ...values };
    for (const f of fields) {
      const v = String(applied[f.name] ?? "").trim();
      if (f.prefix && v) applied[f.name] = f.prefix + v.replace(/\D/g, "");
    }

    setSaving(true);
    const payload = serialize ? serialize(applied) : applied;
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
        <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.name} className="mb-1.5 block">
                {f.label}
                {f.required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea id={f.name} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className={cn(errors[f.name] && "border-destructive focus-visible:ring-destructive")} />
              ) : f.type === "select" ? (
                <Select value={String(values[f.name] ?? "")} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={f.name} className={cn(errors[f.name] && "border-destructive")}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex">
                  {f.prefix && (
                    <span className="inline-flex select-none items-center rounded-l-md border border-r-0 border-input bg-secondary px-3 text-sm text-muted-foreground">{f.prefix}</span>
                  )}
                  <Input
                    id={f.name}
                    type={f.type === "tel" ? "text" : f.type ?? "text"}
                    inputMode={f.type === "tel" ? "numeric" : undefined}
                    maxLength={f.maxLength}
                    value={values[f.name] ?? ""}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (f.type === "tel") val = val.replace(/\D/g, "").slice(0, f.maxLength ?? 10);
                      set(f.name, val);
                    }}
                    placeholder={f.placeholder}
                    className={cn(f.prefix && "rounded-l-none", errors[f.name] && "border-destructive focus-visible:ring-destructive")}
                  />
                </div>
              )}
              {errors[f.name]
                ? <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>
                : f.help && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
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
