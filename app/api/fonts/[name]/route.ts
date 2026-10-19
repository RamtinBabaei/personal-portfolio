import { fontResponse } from "@/lib/server/fonts";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  return fontResponse(name, request.headers.get("if-none-match"));
}
