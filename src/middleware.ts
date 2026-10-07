import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "wz_session";
const PUBLIC = ["/login", "/registro"];

/**
 * Redirige a /login toda ruta de la app sin cookie de sesión. La validación real se hace
 * en el servidor en cada acción/consulta (requireUser). La API responde 401 por sí misma.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
