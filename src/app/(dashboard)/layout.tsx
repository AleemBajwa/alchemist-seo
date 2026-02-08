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
      <main className="ml-56 min-h-screen p-8">{children}</main>
    </div>
  );
}
