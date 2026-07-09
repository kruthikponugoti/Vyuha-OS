// Entity types for all Vyuha OS tables. Dates are ISO strings; money is plain
// numbers in the business currency.

export type Role =
  | "owner"
  | "admin"
  | "manager"
  | "finance"
  | "sales"
  | "hr"
  | "employee"
  | "viewer";

export const ROLES: Role[] = [
  "owner",
  "admin",
  "manager",
  "finance",
  "sales",
  "hr",
  "employee",
  "viewer",
];

export interface Business {
  id: string;
  name: string;
  industry: string;
  country: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  created_at: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  business_id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  notes: string | null;
  total_spend: number;
  created_at: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  owner_id: string | null;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export type DealStage = "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  title: string;
  value: number;
  stage: DealStage;
  owner_id: string | null;
  expected_close: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
}

export interface Warehouse {
  id: string;
  business_id: string;
  name: string;
  location: string | null;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  supplier_id: string | null;
  warehouse_id: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: number;
  cost: number;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  product_id: string;
  warehouse_id: string | null;
  type: "in" | "out" | "adjustment";
  qty: number;
  reason: string;
  reference: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PurchaseOrderItem {
  product_id: string;
  product_name: string;
  qty: number;
  cost: number;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  status: "draft" | "sent" | "received" | "cancelled";
  items: PurchaseOrderItem[];
  total: number;
  expected_date: string | null;
  created_at: string;
}

export type OrderStatus = "new" | "processing" | "completed" | "cancelled";

export interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  created_by: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  business_id: string;
  order_id: string;
  product_id: string;
  qty: number;
  price: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue";

export interface Invoice {
  id: string;
  business_id: string;
  order_id: string | null;
  customer_id: string;
  number: string;
  type: "invoice" | "quotation";
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  method: "cash" | "upi" | "bank" | "card";
  reference: string | null;
  paid_at: string;
  created_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  tax_amount: number;
  date: string;
  created_by: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department: string;
  designation: string;
  salary: number;
  join_date: string;
  status: "active" | "on_leave" | "exited";
  performance_notes: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  business_id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "half_day" | "leave" | "remote";
  check_in: string | null;
  check_out: string | null;
}

export interface LeaveRequest {
  id: string;
  business_id: string;
  employee_id: string;
  type: "casual" | "sick" | "earned" | "unpaid";
  from_date: string;
  to_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  business_id: string;
  employee_id: string;
  month: string; // YYYY-MM
  gross: number;
  deductions: number;
  net: number;
  status: "draft" | "paid";
  paid_at: string | null;
}

export interface Project {
  id: string;
  business_id: string;
  customer_id: string | null;
  name: string;
  description: string | null;
  status: "planning" | "active" | "on_hold" | "completed";
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  created_at: string;
}

export interface TaskComment {
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export interface TaskAttachment {
  name: string;
  size: number;
  type: string;
  data_url: string | null; // small files are inlined; larger ones store metadata only
  uploaded_by: string;
  created_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  business_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id: string | null;
  due_date: string | null;
  order_index: number;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  created_at: string;
}

export interface DocumentRow {
  id: string;
  business_id: string;
  name: string;
  type:
    | "invoice"
    | "quotation"
    | "purchase_order"
    | "contract"
    | "report"
    | "meeting_notes"
    | "other";
  related_type: string | null;
  related_id: string | null;
  file_url: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KnowledgeBaseFile {
  id: string;
  business_id: string;
  name: string;
  file_url: string | null;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  status: "processing" | "ready" | "failed";
  created_at: string;
}

export interface Notification {
  id: string;
  business_id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "alert";
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string;
  created_at: string;
}

export interface TableMap {
  businesses: Business;
  users: User;
  customers: Customer;
  leads: Lead;
  deals: Deal;
  categories: Category;
  suppliers: Supplier;
  warehouses: Warehouse;
  products: Product;
  stock_movements: StockMovement;
  purchase_orders: PurchaseOrder;
  orders: Order;
  order_items: OrderItem;
  invoices: Invoice;
  payments: Payment;
  expenses: Expense;
  employees: Employee;
  attendance: Attendance;
  leave_requests: LeaveRequest;
  payroll: Payroll;
  projects: Project;
  tasks: Task;
  documents: DocumentRow;
  knowledge_base_files: KnowledgeBaseFile;
  notifications: Notification;
  audit_logs: AuditLog;
}

export type TableName = keyof TableMap;
