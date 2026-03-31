export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/money/:path*",
    "/habits/:path*",
    "/activity/:path*",
    "/journal/:path*",
    "/goals/:path*",
    "/health/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
