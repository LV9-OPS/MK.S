import { NextResponse, type NextRequest } from "next/server";
import { validateSessionToken } from "@/server/auth";

// Garde d'accès en amont du rendu : renvoie de vraies redirections HTTP (307) pour les zones
// privées. Ce n'est PAS la seule protection : chaque page, action, route et service
// revérifie la session et le rôle côté serveur.
const MEMBER_PREFIXES = ["/ressources", "/stats", "/compte"];
const SESSION_COOKIE = "mks_session";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isMemberArea = MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isAdminArea && !isMemberArea) return NextResponse.next();

  const user = await validateSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(pathname + search)}`;
    const res = NextResponse.redirect(url, 307);
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE); // session expirée ou révoquée
    return res;
  }
  if (isAdminArea && user.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/acces-refuse";
    url.search = "";
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/ressources/:path*", "/stats/:path*", "/compte/:path*", "/admin", "/ressources", "/stats", "/compte"],
};
