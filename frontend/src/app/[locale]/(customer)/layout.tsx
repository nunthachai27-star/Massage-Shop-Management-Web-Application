import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { Footer } from "@/components/layout/Footer";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-dark flex flex-col">
      <CustomerNavbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
