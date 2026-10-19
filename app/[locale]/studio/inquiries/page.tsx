import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { runtime } from "@/lib/server/runtime";
import { isLocale } from "@/lib/domain";
import { inquiryQuerySchema, inquiryView } from "@/lib/inquiries";
import { InquiryDashboard } from "@/components/inquiry-dashboard";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function InquiryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  try {
    await requireAdmin();
  } catch {
    return (
      <main id="main" className="section inner-page">
        <h1 className="page-title">
          {locale === "en" ? "Private inquiries" : "درخواست‌های خصوصی"}
        </h1>
        {runtime().ADMIN_AUTH_MODE === "sites" ? (
          <a
            href={chatGPTSignInPath(`/${locale}/studio/inquiries`)}
            target="_top"
          >
            Sign in with ChatGPT
          </a>
        ) : (
          <p>
            Owner authentication is required. Configure ADMIN_AUTH_MODE and
            private credentials on the server.
          </p>
        )}
      </main>
    );
  }
  const data = await (
    await getStore()
  ).queryInquiries(inquiryQuerySchema.parse({}));
  const env = runtime();
  return (
    <main id="main" className="section inner-page inquiry-page">
      <div className="studio-head">
        <div>
          <p className="eyebrow">PRIVATE / CLIENT CONVERSATIONS</p>
          <h1>{locale === "en" ? "Your inquiries." : "درخواست‌های شما."}</h1>
        </div>
      </div>
      <InquiryDashboard
        locale={locale}
        initial={{ ...data, items: data.items.map(inquiryView) }}
        notificationConfigured={!!env.RESEND_API_KEY && !!env.CONTACT_FROM}
      />
    </main>
  );
}
