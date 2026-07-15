import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Vazirmatn, Manrope, DM_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import "../globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

// Marketing-landing-page-only typography — scoped via the .landing wrapper
// class so the rest of the app keeps Hanken Grotesk untouched.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOBI CRM",
    template: "%s · SOBI CRM",
  },
  description: "The operating system for your business.",
  applicationName: "SOBI CRM",
  icons: {
    icon: "/Favicon.png",
    shortcut: "/Favicon.png",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const dir = localeMeta[locale as AppLocale].dir;

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${hanken.variable} ${plexMono.variable} ${vazirmatn.variable} ${manrope.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="h-full">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
