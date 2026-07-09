// The AI Business Copilot.
//
// With GEMINI_API_KEY set: Gemini 2.0 Flash function calling over the tool
// registry, resolving chained calls. Without it: a deterministic local router
// drives the exact same tools against the same data, so the Copilot is fully
// functional in demo mode.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@/lib/auth";
import { actorFromSession } from "@/lib/services";
import {
  ACTION_LABELS, DESTRUCTIVE, runTool, declarationsForRole, refusalFor,
} from "@/lib/copilot/tools";
import { canUseTool } from "@/lib/permissions";
import { routeLocally } from "@/lib/copilot/local-router";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = (currency) =>
  "You are the AI Business Copilot for Vyuha OS, an operating system for small businesses. " +
  "Always call a function to answer questions about the business's data — never invent numbers, " +
  "names, or figures. For actions that change data (creating invoices or orders, recording " +
  "payments, updating stock, adding customers), confirm with the user before executing unless they " +
  "were explicit. Explain results in one or two concise, plain sentences a busy owner would " +
  "understand. Currency is " + currency + ". No filler, no exclamation marks.";

// Tells the model the caller's role and that it must not attempt work outside
// the tools it's been given — if asked, decline politely.
const ROLE_NOTE = (role) =>
  ` The person you're helping has the ${role} role. Only the tools you have been given are available to that role. ` +
  `If they ask for something outside those tools (for example an employee asking about payroll, or a role asking about a module they can't access), politely say their role doesn't have access to it — never guess or reveal that data.`;

function shapeResponse(toolName, result) {
  return {
    reply: result.summary,
    action: toolName ? { name: toolName, label: ACTION_LABELS[toolName] ?? "Done" } : null,
    trace: result.trace ?? null,
    invoice_id: result.invoice_id ?? null,
    data: result.data ?? null,
    ok: result.ok,
  };
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorised" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const { message, history = [], confirm = false } = body;
  if (!message || typeof message !== "string") {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const actor = actorFromSession(session);
  const ctx = { actor };
  const key = process.env.GEMINI_API_KEY;

  try {
    const result = key
      ? await runGemini(key, message, history, ctx, confirm, session.business.currency)
      : await runLocal(message, ctx, confirm);
    return Response.json(result);
  } catch (err) {
    console.error("copilot error:", err);
    return Response.json(
      { reply: "Something went wrong running that. Try rephrasing, or try again.", action: null, ok: false },
      { status: 200 }
    );
  }
}

// ---- Gemini path -----------------------------------------------------------

async function runGemini(key, message, history, ctx, confirm, currency) {
  const genAI = new GoogleGenerativeAI(key);
  // Role-gate the tools Gemini can even see, so it can't be a backdoor.
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT(currency) + ROLE_NOTE(ctx.actor.role),
    tools: [{ functionDeclarations: declarationsForRole(ctx.actor.role) }],
  });

  const chat = model.startChat({
    history: (history || [])
      .filter((m) => m.text)
      .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
  });

  let response = (await chat.sendMessage(message)).response;
  let lastTool = null;
  let lastResult = null;

  for (let i = 0; i < 5; i++) {
    const calls = response.functionCalls?.() || [];
    if (!calls.length) break;

    const parts = [];
    for (const call of calls) {
      // Confirmation gate for destructive actions (unless already confirmed).
      if (DESTRUCTIVE.has(call.name) && !confirm) {
        return {
          reply: `Just to confirm — you want me to ${ACTION_LABELS[call.name]?.toLowerCase() ?? call.name}? Say “yes” and I'll go ahead.`,
          action: { name: call.name, label: ACTION_LABELS[call.name] },
          pendingConfirm: { name: call.name, args: call.args ?? {} },
          ok: true,
        };
      }
      const result = await runTool(call.name, call.args ?? {}, ctx);
      lastTool = call.name;
      lastResult = result;
      parts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    response = (await chat.sendMessage(parts)).response;
  }

  const text = response.text?.()?.trim();
  if (!lastTool) {
    return { reply: text || "I can help with sales, stock, invoices, payments and more. What do you need?", action: null, ok: true };
  }
  const shaped = shapeResponse(lastTool, lastResult);
  if (text) shaped.reply = text; // prefer Gemini's phrasing when present
  return shaped;
}

// ---- Local path ------------------------------------------------------------

async function runLocal(message, ctx, confirm) {
  // Handle a bare confirmation ("yes") arriving with a pending action.
  const { tool, args } = routeLocally(message);

  if (!tool) {
    return {
      reply:
        "I can check revenue, stock and business health, record orders and payments, create invoices and quotations, add customers, and draft reminders. Try “Record an order from Ananya Reddy — 2 Cane Lounge Chair” or “Show this month's revenue.”",
      action: null,
      ok: true,
    };
  }

  // Role gate before anything else — never confirm or run a forbidden tool.
  if (!canUseTool(ctx.actor.role, tool)) {
    const refusal = refusalFor(ctx.actor.role, tool);
    return { reply: refusal.summary, action: null, ok: false };
  }

  if (DESTRUCTIVE.has(tool) && !confirm) {
    return {
      reply: `Just to confirm — ${confirmPhrase(tool, args)}? Send “yes” and I'll do it.`,
      action: { name: tool, label: ACTION_LABELS[tool] },
      pendingConfirm: { name: tool, args },
      ok: true,
    };
  }

  const result = await runTool(tool, args, ctx);
  return shapeResponse(tool, result);
}

function confirmPhrase(tool, args) {
  switch (tool) {
    case "create_order":
      return `record an order from ${args.customer_name || "the customer"} for ${(args.items || []).map((i) => `${i.qty} × ${i.product_name}`).join(", ") || "these items"}`;
    case "create_invoice":
      return `create an invoice for ${args.customer_name || "the customer"}`;
    case "create_quotation":
      return `create a quotation for ${args.customer_name || "the customer"}`;
    case "record_payment":
      return `record a payment against ${args.invoice_ref || "that invoice"}`;
    case "update_stock":
      return `adjust stock of ${args.product_name} by ${args.qty}`;
    case "create_customer":
      return `add ${args.name || "this customer"} to your customers`;
    case "create_staff_account":
      return `create a ${args.role || "staff"} account for ${args.name || args.email || "this person"}${args.email ? ` (${args.email})` : ""}`;
    case "add_expense":
      return `log a ${args.amount ? "₹" + args.amount : ""} expense for ${args.description || "this"}`;
    case "decide_leave":
      return `${args.decision === "rejected" ? "reject" : "approve"} ${args.employee_name || "the employee"}'s leave request`;
    default:
      return "run that action";
  }
}
