import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Routes that require an authenticated session.
const PROTECTED = [
  "/dashboard",
  "/copilot",
  "/crm",
  "/inventory",
  "/finance",
  "/hr",
  "/projects",
  "/analytics",
  "/documents",
  "/knowledge-base",
  "/notifications",
  "/settings",
  "/onboarding",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);
  if (!isProtected && !isAuthPage) return NextResponse.next();

  // Expose the current path to server components (the app layout reads this to
  // enforce role-based module access — see app/(app)/layout.tsx).
  const forward = new Headers(req.headers);
  forward.set("x-pathname", pathname);
  const nextWithPath = () => NextResponse.next({ request: { headers: forward } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const usingSupabase = Boolean(url && anonKey && url.startsWith("http"));

  // Hybrid: a demo session (role-picker cookie) is authenticated regardless of
  // whether Supabase is configured — check it first so demo and real coexist.
  // A real Supabase session cookie ALWAYS wins over a demo cookie (mirrors
  // isDemoRequest() in lib/db), so the two auth-decision points can't disagree
  // and cause a /login↔/dashboard redirect loop.
  const hasRealSessionCookie = req.cookies
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && Boolean(c.value));
  const demoAuthed = Boolean(req.cookies.get("vyuha-demo-auth")) && !hasRealSessionCookie;
  if (demoAuthed) {
    if (isAuthPage) {
      const to = req.nextUrl.clone();
      to.pathname = "/dashboard";
      return NextResponse.redirect(to);
    }
    return nextWithPath();
  }

  let authed = false;

  if (usingSupabase) {
    const res = NextResponse.next({ request: { headers: forward } });
    const supabase = createServerClient(url!, anonKey!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) =>
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = Boolean(user);
    if (isProtected && !authed) {
      const to = req.nextUrl.clone();
      to.pathname = "/login";
      to.searchParams.set("next", pathname);
      return NextResponse.redirect(to);
    }
    if (isAuthPage && authed) {
      const to = req.nextUrl.clone();
      to.pathname = "/dashboard";
      return NextResponse.redirect(to);
    }
    return res;
  }

  // Demo mode
  authed = Boolean(req.cookies.get("vyuha-demo-auth"));
  if (isProtected && !authed) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }
  if (isAuthPage && authed) {
    const to = req.nextUrl.clone();
    to.pathname = "/dashboard";
    return NextResponse.redirect(to);
  }
  return nextWithPath();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
