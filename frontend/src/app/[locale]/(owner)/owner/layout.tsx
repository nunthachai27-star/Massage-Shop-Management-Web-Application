import { OwnerSidebar } from "@/components/layout/OwnerSidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-dark">
      <OwnerSidebar />
      <main className="md:ml-64 pb-20 md:pb-0 p-6">{children}</main>
    </div>
  );
}
