// Deterministic seed for Vyuha OS. One generator feeds both the local demo
// store and supabase/seed.sql (via scripts/gen-seed-sql.ts), so demo mode and
// a real Supabase project always carry identical data.

import type { LocalDatabase } from "./local-client";

const DAY = 86400000;

// mulberry32 — tiny deterministic RNG so every run seeds identical data
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const uid = (code: string, n: number) =>
  `00000000-0000-4000-8000-${code}${String(n).padStart(8, "0")}`;

export const BIZ_ID = uid("b100", 1);
export const USER_IDS = {
  owner: uid("a100", 1),
  admin: uid("a100", 2),
  manager: uid("a100", 3),
  finance: uid("a100", 4),
  sales: uid("a100", 5),
  hr: uid("a100", 6),
  employee: uid("a100", 7),
  viewer: uid("a100", 8),
};

export function buildSeedDatabase(now = Date.now()): LocalDatabase {
  const rand = rng(42);
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const iso = (t: number) => new Date(t).toISOString();
  const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
  const daysAgo = (d: number, h = 10, m = 0) => {
    const dt = new Date(now - d * DAY);
    dt.setHours(h, m, 0, 0);
    return dt.getTime();
  };

  const db: LocalDatabase = {};
  const B = BIZ_ID;

  db.businesses = [
    {
      id: B,
      name: "Vyuha Home Store",
      industry: "Retail",
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata",
      logo_url: null,
      created_at: iso(daysAgo(400)),
    },
  ];

  db.users = (
    [
      ["owner", "Kruthik Ponugoti", "ponugotikruthik18@gmail.com"],
      ["admin", "Nikhil Rao", "nikhil.rao@vyuhastore.in"],
      ["manager", "Shreya Kulkarni", "shreya.kulkarni@vyuhastore.in"],
      ["finance", "Farah Khan", "farah.khan@vyuhastore.in"],
      ["sales", "Rohit Verma", "rohit.verma@vyuhastore.in"],
      ["hr", "Anjali Menon", "anjali.menon@vyuhastore.in"],
      ["employee", "Devansh Joshi", "devansh.joshi@vyuhastore.in"],
      ["viewer", "Tara Bhat", "tara.bhat@vyuhastore.in"],
    ] as const
  ).map(([role, name, email], i) => ({
    id: uid("a100", i + 1),
    auth_id: null,
    business_id: B,
    name,
    email,
    role,
    avatar_url: null,
    created_at: iso(daysAgo(380 - i * 5)),
  }));

  db.categories = ["Furniture", "Lighting", "Decor", "Textiles", "Storage", "Outdoor"].map(
    (name, i) => ({ id: uid("e100", i + 1), business_id: B, name })
  );
  const cat = (name: string) => db.categories.find((c) => c.name === name)!.id;

  db.suppliers = [
    ["Sharma Timber Works", "Mahesh Sharma", "Jaipur"],
    ["Deccan Crafts Co", "Lakshmi Devi", "Hyderabad"],
    ["Coastal Cane & Rattan", "Thomas Kurien", "Kochi"],
    ["Lumina Lighting Pvt Ltd", "Ritu Malhotra", "Mumbai"],
    ["Weave & Loom Textiles", "Harpreet Gill", "Panipat"],
    ["Everline Steelworks", "Sandeep Patil", "Pune"],
  ].map(([name, contact, city], i) => ({
    id: uid("e200", i + 1),
    business_id: B,
    name,
    contact_name: contact,
    phone: `+91 98${int(100, 999)}0 ${int(10000, 99999)}`,
    email: `${contact.toLowerCase().split(" ")[0]}@${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10)}.in`,
    city,
  }));

  db.warehouses = [
    ["Main Store", "Indiranagar, Bengaluru"],
    ["City Warehouse", "Whitefield, Bengaluru"],
  ].map(([name, location], i) => ({ id: uid("e300", i + 1), business_id: B, name, location }));

  // [name, category, supplierIdx, price, cost, stock, threshold]
  const productSpecs: [string, string, number, number, number, number, number][] = [
    ["Teak Coffee Table", "Furniture", 0, 8450, 5200, 14, 5],
    ["Oak Bookshelf", "Furniture", 0, 12900, 8100, 3, 6],
    ["Sheesham Dining Chair", "Furniture", 0, 3250, 1950, 26, 8],
    ["Rattan Accent Chair", "Furniture", 2, 6800, 4100, 4, 5],
    ["Walnut Study Desk", "Furniture", 0, 15400, 9700, 9, 4],
    ["Fabric 3-Seater Sofa", "Furniture", 1, 32500, 21000, 6, 3],
    ["Cane Lounge Chair", "Furniture", 2, 7200, 4300, 11, 5],
    ["Marble Side Table", "Furniture", 1, 5600, 3400, 2, 4],
    ["Brass Floor Lamp", "Lighting", 3, 4100, 2500, 17, 6],
    ["Ceramic Table Lamp", "Lighting", 3, 1850, 1050, 22, 8],
    ["Jute Area Rug", "Textiles", 4, 2950, 1700, 5, 7],
    ["Cotton Cushion Set", "Textiles", 4, 1200, 650, 48, 15],
    ["Linen Curtain Pair", "Textiles", 4, 2400, 1400, 31, 10],
    ["Mango Wood TV Unit", "Furniture", 0, 18700, 11900, 7, 3],
    ["Steel Storage Cabinet", "Storage", 5, 9800, 6100, 12, 4],
    ["Velvet Ottoman", "Furniture", 1, 4650, 2800, 3, 5],
    ["Glass Display Cabinet", "Storage", 5, 21300, 13600, 8, 3],
    ["Bamboo Shoe Rack", "Storage", 2, 1750, 950, 19, 6],
    ["Acacia Bar Stool", "Furniture", 0, 2900, 1700, 15, 6],
    ["Terracotta Planter Set", "Outdoor", 1, 1450, 800, 27, 10],
  ];
  db.products = productSpecs.map(([name, category, sIdx, price, cost, stock, threshold], i) => ({
    id: uid("e400", i + 1),
    business_id: B,
    category_id: cat(category),
    supplier_id: db.suppliers[sIdx].id,
    warehouse_id: db.warehouses[i % 2].id,
    name,
    sku: `VYU-${String(i + 1).padStart(3, "0")}`,
    barcode: `8901${String(4520000 + i * 37).padStart(9, "0")}`,
    description: null,
    price,
    cost,
    stock_qty: stock,
    low_stock_threshold: threshold,
    created_at: iso(daysAgo(300 - i)),
  }));

  const customerSpecs: [string, string | null, string][] = [
    ["Aarav Sharma", null, "Bengaluru"],
    ["Priya Iyer", null, "Bengaluru"],
    ["Rohan Mehta", null, "Mysuru"],
    ["Ananya Reddy", null, "Hyderabad"],
    ["Vikram Singh", null, "Bengaluru"],
    ["Kavita Nair", null, "Kochi"],
    ["Arjun Patel", null, "Ahmedabad"],
    ["Meera Krishnan", null, "Chennai"],
    ["Sanjay Gupta", null, "Bengaluru"],
    ["Divya Chauhan", null, "Pune"],
    ["Rajiv Nanda", "ABC Company", "Bengaluru"],
    ["Sunita Kapoor", "Horizon Interiors LLP", "Bengaluru"],
    ["Joseph D'Souza", "GreenLeaf Cafe", "Bengaluru"],
    ["Aditi Rathi", "Sterling Hotels Group", "Mumbai"],
    ["Karan Malhotra", "Maple & Oak Studio", "Gurugram"],
  ];
  db.customers = customerSpecs.map(([name, company, city], i) => ({
    id: uid("c100", i + 1),
    business_id: B,
    name,
    company,
    phone: `+91 9${int(6000, 9999)}0 ${int(10000, 99999)}`,
    email: company
      ? `${name.toLowerCase().split(" ")[0]}@${company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com`
      : `${name.toLowerCase().replace(/[^a-z]/g, ".")}@gmail.com`,
    address: `${int(2, 220)}, ${pick(["4th Cross", "MG Road", "Residency Road", "100 Ft Road", "Church Street"])}`,
    city,
    country: "India",
    tags: company ? ["business", i % 2 ? "wholesale" : "repeat"] : i % 3 === 0 ? ["repeat"] : [],
    notes: null,
    total_spend: 0, // recomputed below from paid invoices
    created_at: iso(daysAgo(320 - i * 8)),
  }));

  const leadNames: [string, string | null, string][] = [
    ["Neha Bansal", null, "walk-in"],
    ["Zoya Sheikh", "Cedar Living", "website"],
    ["Manoj Pillai", null, "instagram"],
    ["Ritika Jain", "Jain & Sons Decor", "referral"],
    ["Alok Mishra", null, "exhibition"],
    ["Deepa Hegde", "Hegde Homestays", "website"],
    ["Farhan Ali", null, "instagram"],
    ["Ishita Roy", "Roy Interiors", "referral"],
    ["Gaurav Saxena", null, "walk-in"],
    ["Lakshmi Subramaniam", "Chennai Craft House", "exhibition"],
    ["Pooja Desai", null, "website"],
    ["Varun Khanna", "Khanna Estates", "referral"],
  ];
  const leadStatuses = ["new", "new", "contacted", "contacted", "qualified", "qualified", "converted", "lost", "new", "contacted", "qualified", "new"];
  db.leads = leadNames.map(([name, company, source], i) => ({
    id: uid("c200", i + 1),
    business_id: B,
    name,
    company,
    email: `${name.toLowerCase().split(" ")[0]}${int(1, 99)}@gmail.com`,
    phone: `+91 9${int(6000, 9999)}0 ${int(10000, 99999)}`,
    source,
    status: leadStatuses[i],
    owner_id: USER_IDS.sales,
    notes: null,
    created_at: iso(daysAgo(int(1, 45), int(9, 18))),
  }));

  const dealSpecs: [string, number, string, number | null][] = [
    ["Bulk dining chairs — GreenLeaf Cafe", 97500, "negotiation", 12],
    ["Lobby furniture — Sterling Hotels", 264000, "proposal", 11],
    ["Office fit-out — ABC Company", 148000, "qualified", 10],
    ["Homestay furnishing — Hegde Homestays", 86000, "proposal", null],
    ["Studio shelving — Maple & Oak", 54000, "won", 14],
    ["Cafe lighting refresh", 32000, "qualified", 12],
    ["Curtains contract — Horizon Interiors", 41000, "negotiation", 11],
    ["Balcony sets — Khanna Estates", 68500, "qualified", null],
    ["Display cabinets — Jain & Sons", 63900, "lost", null],
    ["Rug supply — Chennai Craft House", 29500, "won", 9],
  ];
  db.deals = dealSpecs.map(([title, value, stage, custIdx], i) => ({
    id: uid("c300", i + 1),
    business_id: B,
    customer_id: custIdx != null ? db.customers[custIdx].id : null,
    lead_id: custIdx == null ? db.leads[(i * 3) % 12].id : null,
    title,
    value,
    stage,
    owner_id: USER_IDS.sales,
    expected_close: ymd(now + int(3, 40) * DAY),
    created_at: iso(daysAgo(int(5, 50))),
  }));

  // ---- Orders / order_items / invoices / payments -------------------------
  db.orders = [];
  db.order_items = [];
  db.invoices = [];
  db.payments = [];
  db.stock_movements = [];

  let itemSeq = 0;
  let paySeq = 0;
  let movSeq = 0;
  let invoiceNo = 0;

  for (let i = 0; i < 30; i++) {
    const orderId = uid("f100", i + 1);
    // 3 orders today, rest spread over 60 days weighted to recent
    const d = i < 3 ? 0 : Math.min(60, Math.floor(Math.pow(rand(), 1.4) * 60) + 1);
    const t = daysAgo(d, int(9, 18), int(0, 59));
    const customer = db.customers[int(0, db.customers.length - 1)];
    const nLines = int(1, 3);
    const used = new Set<number>();
    let total = 0;
    for (let j = 0; j < nLines; j++) {
      let pi = int(0, db.products.length - 1);
      while (used.has(pi)) pi = int(0, db.products.length - 1);
      used.add(pi);
      const p = db.products[pi];
      const qty = int(1, p.price > 15000 ? 2 : 4);
      total += p.price * qty;
      db.order_items.push({
        id: uid("f200", ++itemSeq),
        business_id: B,
        order_id: orderId,
        product_id: p.id,
        qty,
        price: p.price,
      });
      db.stock_movements.push({
        id: uid("e500", ++movSeq),
        business_id: B,
        product_id: p.id,
        warehouse_id: p.warehouse_id,
        type: "out",
        qty,
        reason: "Order fulfilment",
        reference: `ORD-${String(i + 1).padStart(4, "0")}`,
        created_by: USER_IDS.sales,
        created_at: iso(t),
      });
    }
    db.orders.push({
      id: orderId,
      business_id: B,
      customer_id: customer.id,
      status: d === 0 ? "processing" : "completed",
      total,
      created_by: USER_IDS.sales,
      created_at: iso(t),
    });

    // invoice per order
    const invId = uid("f300", ++invoiceNo);
    const due = t + 7 * DAY;
    const roll = rand();
    let status: string;
    let amountPaid = 0;
    if (d === 0) {
      status = "sent";
    } else if (roll < 0.68) {
      status = "paid";
      amountPaid = total;
    } else if (roll < 0.78) {
      status = "partial";
      amountPaid = Math.round(total / 2);
    } else {
      status = due < now ? "overdue" : "sent";
    }
    const taxRate = 18;
    const subtotal = Math.round(total / 1.18);
    db.invoices.push({
      id: invId,
      business_id: B,
      order_id: orderId,
      customer_id: customer.id,
      number: `INV-2026-${String(invoiceNo).padStart(4, "0")}`,
      type: "invoice",
      status,
      issue_date: ymd(t),
      due_date: ymd(due),
      subtotal,
      tax_rate: taxRate,
      tax_amount: total - subtotal,
      total,
      amount_paid: amountPaid,
      notes: null,
      pdf_url: null,
      created_at: iso(t),
    });
    if (amountPaid > 0) {
      db.payments.push({
        id: uid("f400", ++paySeq),
        business_id: B,
        invoice_id: invId,
        customer_id: customer.id,
        amount: amountPaid,
        method: pick(["upi", "upi", "bank", "card", "cash"]),
        reference: `PAY-${String(paySeq).padStart(4, "0")}`,
        paid_at: iso(Math.min(due, t + int(0, 6) * DAY)),
        created_at: iso(Math.min(due, t + int(0, 6) * DAY)),
      });
    }
  }

  // 3 quotations
  for (let q = 0; q < 3; q++) {
    const customer = db.customers[10 + q];
    const p = db.products[int(0, 19)];
    const qty = int(4, 12);
    const total = p.price * qty;
    const t = daysAgo(int(1, 10), 12);
    db.invoices.push({
      id: uid("f300", ++invoiceNo),
      business_id: B,
      order_id: null,
      customer_id: customer.id,
      number: `QUO-2026-${String(q + 1).padStart(4, "0")}`,
      type: "quotation",
      status: q === 0 ? "draft" : "sent",
      issue_date: ymd(t),
      due_date: ymd(t + 14 * DAY),
      subtotal: Math.round(total / 1.18),
      tax_rate: 18,
      tax_amount: total - Math.round(total / 1.18),
      total,
      amount_paid: 0,
      notes: `Quotation for ${qty} × ${p.name}`,
      pdf_url: null,
      created_at: iso(t),
    });
  }

  // recompute customer total_spend from payments
  for (const c of db.customers) {
    c.total_spend = db.payments
      .filter((p) => p.customer_id === c.id)
      .reduce((s, p) => s + p.amount, 0);
  }

  // ---- Purchase orders + inbound stock ------------------------------------
  db.purchase_orders = [];
  const poStatuses = ["received", "received", "received", "sent", "sent", "draft"];
  for (let i = 0; i < 6; i++) {
    const supplier = db.suppliers[i];
    const supplierProducts = db.products.filter((p) => p.supplier_id === supplier.id);
    const items = supplierProducts.slice(0, Math.max(1, Math.min(3, supplierProducts.length))).map((p) => ({
      product_id: p.id,
      product_name: p.name,
      qty: int(5, 20),
      cost: p.cost,
    }));
    const total = items.reduce((s, it) => s + it.qty * it.cost, 0);
    const t = daysAgo(int(5, 40), 11);
    const status = poStatuses[i];
    db.purchase_orders.push({
      id: uid("e600", i + 1),
      business_id: B,
      supplier_id: supplier.id,
      status,
      items,
      total,
      expected_date: ymd(t + 10 * DAY),
      created_at: iso(t),
    });
    if (status === "received") {
      for (const it of items) {
        db.stock_movements.push({
          id: uid("e500", ++movSeq),
          business_id: B,
          product_id: it.product_id,
          warehouse_id: db.warehouses[1].id,
          type: "in",
          qty: it.qty,
          reason: "Purchase order received",
          reference: `PO-${String(i + 1).padStart(3, "0")}`,
          created_by: USER_IDS.manager,
          created_at: iso(t + 9 * DAY),
        });
      }
    }
  }
  // a few manual adjustments
  for (let i = 0; i < 4; i++) {
    const p = db.products[int(0, 19)];
    db.stock_movements.push({
      id: uid("e500", ++movSeq),
      business_id: B,
      product_id: p.id,
      warehouse_id: p.warehouse_id,
      type: "adjustment",
      qty: pick([-1, -2, 1, 2]),
      reason: pick(["Damage write-off", "Stock count correction", "Display unit returned"]),
      reference: null,
      created_by: USER_IDS.manager,
      created_at: iso(daysAgo(int(1, 20), 17)),
    });
  }

  // ---- Expenses ------------------------------------------------------------
  const expenseSpecs: [string, string, number][] = [
    ["Rent", "Prestige Properties", 85000],
    ["Utilities", "BESCOM", 12400],
    ["Utilities", "BWSSB", 3200],
    ["Marketing", "Meta Ads", 18000],
    ["Marketing", "Google Ads", 15500],
    ["Logistics", "Porter", 9800],
    ["Logistics", "Delhivery", 7600],
    ["Supplies", "Office Depot", 4300],
    ["Salaries", "Payroll", 412000],
    ["Insurance", "ICICI Lombard", 11500],
  ];
  db.expenses = [];
  let expSeq = 0;
  for (let m = 0; m < 2; m++) {
    for (const [category, vendor, base] of expenseSpecs) {
      db.expenses.push({
        id: uid("f500", ++expSeq),
        business_id: B,
        category,
        vendor,
        description: `${category} — ${vendor}`,
        amount: Math.round(base * (0.9 + rand() * 0.2)),
        tax_amount: 0,
        date: ymd(daysAgo(m * 30 + int(2, 26))),
        created_by: USER_IDS.finance,
        created_at: iso(daysAgo(m * 30 + int(2, 26), 15)),
      });
    }
  }

  // ---- HR ------------------------------------------------------------------
  const employeeSpecs: [string, string, string, number, string | null][] = [
    ["Shreya Kulkarni", "Operations", "Store Manager", 68000, USER_IDS.manager],
    ["Farah Khan", "Finance", "Accounts Lead", 62000, USER_IDS.finance],
    ["Rohit Verma", "Sales", "Sales Executive", 42000, USER_IDS.sales],
    ["Anjali Menon", "HR", "HR Generalist", 48000, USER_IDS.hr],
    ["Devansh Joshi", "Operations", "Inventory Associate", 32000, USER_IDS.employee],
    ["Nikhil Rao", "Operations", "General Manager", 85000, USER_IDS.admin],
    ["Sneha Patwardhan", "Sales", "Sales Associate", 30000, null],
    ["Imran Qureshi", "Sales", "Sales Associate", 30000, null],
    ["Lokesh Yadav", "Support", "Delivery Coordinator", 26000, null],
    ["Grace Thomas", "Finance", "Billing Assistant", 28000, null],
  ];
  db.employees = employeeSpecs.map(([name, department, designation, salary, userId], i) => ({
    id: uid("d100", i + 1),
    business_id: B,
    user_id: userId,
    name,
    email: `${name.toLowerCase().split(" ")[0]}.${name.toLowerCase().split(" ")[1]}@vyuhastore.in`,
    phone: `+91 9${int(6000, 9999)}0 ${int(10000, 99999)}`,
    department,
    designation,
    salary,
    join_date: ymd(daysAgo(int(200, 1200))),
    status: i === 8 ? "on_leave" : "active",
    performance_notes: null,
    created_at: iso(daysAgo(int(200, 1200))),
  }));

  db.attendance = [];
  let attSeq = 0;
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(now - d * DAY);
    if (dt.getDay() === 0) continue; // closed Sundays
    for (const emp of db.employees) {
      const roll = rand();
      let status: string;
      if (emp.status === "on_leave" && d < 5) status = "leave";
      else if (roll < 0.82) status = "present";
      else if (roll < 0.9) status = "remote";
      else if (roll < 0.95) status = "half_day";
      else status = "absent";
      db.attendance.push({
        id: uid("d200", ++attSeq),
        business_id: B,
        employee_id: emp.id,
        date: ymd(dt.getTime()),
        status,
        check_in: status === "absent" || status === "leave" ? null : `09:${int(15, 55)}`,
        check_out: status === "absent" || status === "leave" ? null : status === "half_day" ? `13:${int(0, 30)}` : `18:${int(0, 45)}`,
      });
    }
  }

  db.leave_requests = [
    ["casual", 2, 3, "Family function", "pending", null],
    ["sick", 1, 1, "Fever", "approved", USER_IDS.hr],
    ["earned", 5, 9, "Travel to hometown", "approved", USER_IDS.hr],
    ["casual", -3, -2, "Personal work", "approved", USER_IDS.hr],
    ["unpaid", 4, 8, "Extended personal leave", "pending", null],
    ["casual", -8, -8, "Errand", "rejected", USER_IDS.hr],
  ].map(([type, fromD, toD, reason, status, decidedBy], i) => ({
    id: uid("d300", i + 1),
    business_id: B,
    employee_id: db.employees[(i * 2 + 2) % 10].id,
    type,
    from_date: ymd(now + (fromD as number) * DAY),
    to_date: ymd(now + (toD as number) * DAY),
    reason,
    status,
    decided_by: decidedBy,
    created_at: iso(daysAgo(int(1, 10), 11)),
  }));

  db.payroll = [];
  let prSeq = 0;
  for (const month of ["2026-05", "2026-06"]) {
    for (const emp of db.employees) {
      const gross = emp.salary;
      const deductions = Math.round(gross * (0.08 + rand() * 0.04));
      db.payroll.push({
        id: uid("d400", ++prSeq),
        business_id: B,
        employee_id: emp.id,
        month,
        gross,
        deductions,
        net: gross - deductions,
        status: "paid",
        paid_at: iso(new Date(`${month}-28T12:00:00Z`).getTime() + 3 * DAY),
      });
    }
  }

  // ---- Projects & tasks ------------------------------------------------------
  const projectSpecs: [string, string, number | null, string, number | null][] = [
    ["Store Renovation — Indiranagar", "active", null, "Refit the main store display floor", 450000],
    ["Sterling Hotels bulk order", "active", 13, "60-room furniture supply for Sterling Hotels", 2600000],
    ["Website Relaunch", "planning", null, "New storefront website with online catalogue", 180000],
    ["Diwali Campaign 2026", "planning", null, "Festive marketing and in-store events", 120000],
    ["Inventory Audit Q2", "completed", null, "Full physical stock verification, both warehouses", null],
  ];
  db.projects = projectSpecs.map(([name, status, custIdx, description, budget], i) => ({
    id: uid("a200", i + 1),
    business_id: B,
    customer_id: custIdx != null ? db.customers[custIdx].id : null,
    name,
    description,
    status,
    start_date: ymd(daysAgo(int(10, 60))),
    due_date: status === "completed" ? ymd(daysAgo(5)) : ymd(now + int(15, 90) * DAY),
    budget,
    created_at: iso(daysAgo(int(10, 60))),
  }));

  const taskTitles = [
    ["Finalise floor plan with architect", 0], ["Order display shelving", 0], ["Repaint feature wall", 0], ["Install new lighting rails", 0], ["Reopen soft-launch weekend", 0],
    ["Confirm fabric swatches with Sterling", 1], ["Production schedule with Sharma Timber", 1], ["First 20-room delivery", 1], ["Site measurement visit — Mumbai", 1], ["Payment milestone 2 invoice", 1],
    ["Sitemap and page copy", 2], ["Product photography — top 50 SKUs", 2], ["Choose web agency", 2],
    ["Festive catalogue design", 3], ["Book influencer collabs", 3], ["Plan in-store event calendar", 3], ["Print voucher cards", 3],
    ["Count Main Store stock", 4], ["Count City Warehouse stock", 4], ["Reconcile variances", 4], ["File audit report", 4],
    ["Update supplier price lists", 0], ["Clear damaged goods rack", 4], ["Train staff on new POS flow", 2], ["Draft return policy update", 3],
  ] as [string, number][];
  const taskStatuses = ["done", "done", "in_progress", "todo", "todo", "in_progress", "done", "todo", "review", "todo", "in_progress", "todo", "review", "todo", "todo", "in_progress", "todo", "done", "done", "review", "done", "in_progress", "todo", "todo", "todo"];
  db.tasks = taskTitles.map(([title, pIdx], i) => ({
    id: uid("a300", i + 1),
    business_id: B,
    project_id: db.projects[pIdx].id,
    title,
    description: null,
    status: taskStatuses[i],
    priority: pick(["low", "medium", "medium", "high", "urgent"]),
    assignee_id: pick(db.users.slice(1, 7)).id,
    due_date: ymd(now + int(-5, 30) * DAY),
    order_index: i,
    comments:
      i % 6 === 0
        ? [
            {
              user_id: USER_IDS.manager,
              user_name: "Shreya Kulkarni",
              body: "Discussed in Monday standup — on track.",
              created_at: iso(daysAgo(2, 11)),
            },
          ]
        : [],
    created_at: iso(daysAgo(int(3, 45))),
  }));

  // ---- Documents, KB, notifications, audit ----------------------------------
  db.documents = [
    ["Sterling Hotels supply contract", "contract", "customer", db.customers[13].id],
    ["Horizon Interiors rate agreement", "contract", "customer", db.customers[11].id],
    ["Q2 business review", "report", null, null],
    ["June sales summary", "report", null, null],
    ["Vendor meeting notes — Sharma Timber", "meeting_notes", null, null],
    ["Offer letter — Sneha Patwardhan", "other", "employee", db.employees[6].id],
    ["PO-003 confirmation", "purchase_order", null, null],
    ["Renovation budget workings", "other", "project", db.projects[0].id],
  ].map(([name, type, relType, relId], i) => ({
    id: uid("a400", i + 1),
    business_id: B,
    name,
    type,
    related_type: relType,
    related_id: relId,
    file_url: null,
    content: null,
    created_by: USER_IDS.admin,
    created_at: iso(daysAgo(int(2, 40), 16)),
  }));

  db.knowledge_base_files = [
    [
      "Return & Refund Policy.pdf",
      "application/pdf",
      "Vyuha Home Store return and refund policy. Customers may return furniture within 7 days of delivery if unused and in original packaging. Custom or made-to-order pieces are non-returnable. Refunds are issued to the original payment method within 5 business days of inspection. Damaged-on-arrival items are replaced free of charge if reported within 48 hours with photos. Delivery fees are non-refundable except for our error.",
    ],
    [
      "Warranty Terms.pdf",
      "application/pdf",
      "All solid-wood furniture carries a 3-year warranty against manufacturing defects including joint failure, warping and hardware breakage. Upholstered items carry a 1-year warranty on frames and 6 months on fabric. Lighting products carry a 1-year electrical warranty. The warranty does not cover normal wear, water damage, or improper assembly by third parties. Claims require the original invoice number.",
    ],
    [
      "Store Operations Handbook.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Store hours are 10:00 to 20:30, Monday through Saturday; closed Sundays. Opening checklist: lights, POS float of 5,000 rupees, display dusting, stock of the day board. Deliveries within Bengaluru are free above 25,000 rupees, otherwise 800 rupees flat. EMI is available on purchases above 20,000 rupees through Bajaj Finserv and all major credit cards. Bulk and trade orders above 1 lakh rupees require a 40 percent advance.",
    ],
    [
      "Supplier Onboarding Checklist.pdf",
      "application/pdf",
      "New supplier onboarding requires: GSTIN certificate, cancelled cheque, two trade references, sample approval by the store manager, and signed rate contract valid for 12 months. Payment terms default to net 30 from goods receipt. Quality rejections above 4 percent in a quarter trigger a supplier review.",
    ],
  ].map(([name, mime, text], i) => ({
    id: uid("a500", i + 1),
    business_id: B,
    name,
    file_url: null,
    mime_type: mime,
    size_bytes: 40000 + i * 12500,
    extracted_text: text,
    status: "ready",
    created_at: iso(daysAgo(int(10, 60), 13)),
  }));

  db.notifications = [
    ["Low stock: Marble Side Table", "Only 2 left — below the reorder point of 4.", "warning", false, "/inventory"],
    ["Low stock: Oak Bookshelf", "Only 3 left — below the reorder point of 6.", "warning", false, "/inventory"],
    ["Invoice overdue", "INV-2026-0007 for Rohan Mehta is past due.", "alert", false, "/finance/invoices"],
    ["Leave request pending", "A casual leave request awaits approval.", "info", false, "/hr/leave"],
    ["Payment received", "Payment recorded against INV-2026-0021.", "success", true, "/finance/payments"],
    ["New lead from website", "Zoya Sheikh (Cedar Living) submitted an enquiry.", "info", true, "/crm/leads"],
    ["Purchase order received", "PO-002 stock has been added to City Warehouse.", "success", true, "/inventory/purchase-orders"],
    ["Quotation sent", "QUO-2026-0002 sent to Sterling Hotels Group.", "info", true, "/finance/invoices"],
    ["Payroll processed", "June payroll marked paid for 10 employees.", "success", true, "/hr/payroll"],
    ["Task due tomorrow", "First 20-room delivery (Sterling Hotels bulk order).", "info", false, "/projects"],
  ].map(([title, body, type, read, link], i) => ({
    id: uid("a600", i + 1),
    business_id: B,
    user_id: null,
    title,
    body,
    type,
    read,
    link,
    created_at: iso(daysAgo(i === 0 ? 0 : int(0, 6), 9 + i)),
  }));

  db.audit_logs = [];
  const auditActions: [string, string, string, string][] = [
    ["created", "invoice", "INV-2026-0030", "Created invoice for Aarav Sharma"],
    ["recorded", "payment", "PAY-0021", "Recorded UPI payment of ₹14,400"],
    ["updated", "product", "Oak Bookshelf", "Stock adjusted -1 (damage write-off)"],
    ["approved", "leave_request", "LR-0003", "Approved earned leave for Imran Qureshi"],
    ["created", "customer", "Sterling Hotels Group", "Added new business customer"],
    ["created", "purchase_order", "PO-005", "Raised PO to Weave & Loom Textiles"],
    ["updated", "deal", "Lobby furniture — Sterling Hotels", "Moved to proposal"],
    ["created", "task", "First 20-room delivery", "Added to Sterling Hotels bulk order"],
    ["exported", "report", "June sales summary", "Generated monthly sales PDF"],
    ["updated", "settings", "notifications", "Changed low-stock alert threshold"],
  ];
  const auditUsers = [USER_IDS.owner, USER_IDS.admin, USER_IDS.manager, USER_IDS.finance, USER_IDS.sales, USER_IDS.hr];
  for (let i = 0; i < 25; i++) {
    const [action, entityType, entityId, detail] = auditActions[i % auditActions.length];
    const u = auditUsers[i % auditUsers.length];
    db.audit_logs.push({
      id: uid("a700", i + 1),
      business_id: B,
      user_id: u,
      user_name: db.users.find((x) => x.id === u)!.name,
      action,
      entity_type: entityType,
      entity_id: entityId,
      detail,
      created_at: iso(daysAgo(Math.floor(i / 2), 9 + (i % 9))),
    });
  }

  return db;
}
