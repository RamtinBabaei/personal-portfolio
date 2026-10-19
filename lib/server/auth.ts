import { headers } from "next/headers";
import { adminIdentity } from "./admin-access";
import { runtime } from "./runtime";
export async function requireAdmin() {
  return adminIdentity(new Headers(await headers()), runtime());
}
