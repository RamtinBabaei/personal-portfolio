import { NextResponse, type NextRequest } from "next/server";
import { protectAdminRequest } from "./lib/server/admin-access";
import { runtime } from "./lib/server/runtime";
export async function proxy(request: NextRequest) {
  return (await protectAdminRequest(request, runtime())) ?? NextResponse.next();
}
export const config = {
  matcher: ["/en/studio/:path*", "/fa/studio/:path*", "/api/studio/:path*"],
};
