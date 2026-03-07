import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Massage & Spa",
  description: "Premium Health Massage Services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
