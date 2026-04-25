import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isApi = req.nextUrl.pathname.startsWith("/api");
  const isAuth = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");

  if (isDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }
  if (isAuth && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }
  const isWebhook = req.nextUrl.pathname.startsWith("/api/webhooks");
  if (isApi && !isLoggedIn && !req.nextUrl.pathname.startsWith("/api/auth") && !isWebhook) {
    const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/((?!auth).*)"],
};
