import { runtime } from "@/lib/server/runtime";
import { submitContact } from "@/lib/server/contact";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return submitContact(request);
}

export function GET() {
  const env = runtime();
  return Response.json(
    {
      automaticNotifications: true,
      emailConfigured: !!env.RESEND_API_KEY && !!env.CONTACT_FROM,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
