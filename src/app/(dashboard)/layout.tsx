import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-gray-50">
        <div className="mx-auto max-w-7xl p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
