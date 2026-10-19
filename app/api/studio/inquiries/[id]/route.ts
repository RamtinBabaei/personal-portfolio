import { getInquiry, editInquiry } from "@/lib/server/inquiry-admin";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return getInquiry((await context.params).id);
}
export async function PATCH(request: Request, context: Context) {
  return editInquiry(request, (await context.params).id);
}
