import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import AuthStatus from "@/components/AuthStatus";

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
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 w-full relative z-[100]">
          <div className="font-semibold text-lg">Deda</div>
          <AuthStatus />
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
