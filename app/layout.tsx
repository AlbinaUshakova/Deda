import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import AuthStatus from "@/components/AuthStatus";
import BrandToggle from "@/components/BrandToggle";
import GlobalAlphabetOverlay from "@/components/GlobalAlphabetOverlay";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deda — Learn Alphabets by Play",
  description: "Georgian alphabet for Russian speakers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${manrope.className} min-h-screen bg-[#020617] text-white`}>
        <header className="relative z-[100] mx-auto flex w-full max-w-[1520px] flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-3 md:px-8">
          <BrandToggle />
          <AuthStatus />
        </header>
        <GlobalAlphabetOverlay />

        <main>{children}</main>
      </body>
    </html>
  );
}
