import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ชาลิตา นวดเพื่อสุขภาพ",
  description: "ชาลิตา นวดเพื่อสุขภาพ - Premium Health Massage Services",
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
