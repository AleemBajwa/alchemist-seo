import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen px-5 py-5 md:px-8 md:py-7">
        <div className="mx-auto max-w-[1220px]">{children}</div>
      </main>
    </div>
  );
}
