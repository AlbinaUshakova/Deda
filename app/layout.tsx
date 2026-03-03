import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import AuthStatus from "@/components/AuthStatus";
import BrandToggle from "@/components/BrandToggle";
import GlobalAlphabetOverlay from "@/components/GlobalAlphabetOverlay";
import HeaderLessonTitle from "@/components/HeaderLessonTitle";

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
      <body className={`${manrope.className} min-h-screen bg-gradient-to-b from-[#f7f8fc] via-[#f3f5fb] to-[#eef2f9] text-slate-800`}>
        <header className="sticky top-0 z-[100] mx-auto flex w-full max-w-[1520px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-6 py-3 text-slate-700 backdrop-blur-md md:px-8">
          <BrandToggle />
          <HeaderLessonTitle />
          <AuthStatus />
        </header>
        <GlobalAlphabetOverlay />

        <main>{children}</main>
      </body>
    </html>
  );
}
