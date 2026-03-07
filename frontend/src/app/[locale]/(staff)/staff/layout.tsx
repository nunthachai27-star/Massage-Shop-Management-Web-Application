import { StaffSidebar } from "@/components/layout/StaffSidebar";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-dark">
      <StaffSidebar />
      <main className="md:ml-64 pb-20 md:pb-0 p-6">{children}</main>
    </div>
  );
}
