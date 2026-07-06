import type { TableName } from "@/lib/types";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "tel" | "textarea" | "select" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  full?: boolean; // span both columns
  help?: string;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  sortValue?: (row: T) => string | number;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface CrudTableProps<T extends { id: string }> {
  table: TableName;
  rows: T[];
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  searchKeys: (keyof T)[];
  filters?: FilterDef[];
  entityName: string; // singular, e.g. "customer"
  revalidate: string;
  canWrite: boolean;
  rowHref?: (row: T) => string;
  exportName?: string;
  serialize?: (values: Record<string, any>) => Record<string, any>; // transform form → row
  initial?: Record<string, any>;
}
