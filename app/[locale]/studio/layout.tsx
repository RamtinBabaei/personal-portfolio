export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private studio",
  robots: { index: false, follow: false },
};
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
