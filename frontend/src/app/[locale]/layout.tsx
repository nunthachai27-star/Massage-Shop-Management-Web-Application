import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import {
  Playfair_Display,
  Inter,
  Noto_Sans_Thai,
  Noto_Serif_Thai,
} from "next/font/google";
import "../globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai"],
  variable: "--font-noto-serif-thai",
  display: "swap",
});

const fontVariables = `${playfair.variable} ${inter.variable} ${notoSansThai.variable} ${notoSerifThai.variable}`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={fontVariables}>{children}</div>
    </NextIntlClientProvider>
  );
}
