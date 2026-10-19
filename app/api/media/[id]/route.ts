import { runtime } from "@/lib/server/runtime";
import { getStore } from "@/lib/server/store";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const db = await getStore();
  const path = `/api/media/${id}`;
  const isPublic = await db.isMediaPublic(path);
  if (!isPublic) return new Response(null, { status: 404 });
  const object = await runtime().BUCKET?.get(id);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
