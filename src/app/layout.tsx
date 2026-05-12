import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SalomPreferencesProvider } from "@/lib/salomPreferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Salom Taxi", template: "%s · Salom Taxi" },
  description: "Kichik shaharlar uchun operator boshqaruvi va dispatch platformasi",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} min-h-screen`}
      >
        <SalomPreferencesProvider>{children}</SalomPreferencesProvider>
      </body>
    </html>
  );
}
