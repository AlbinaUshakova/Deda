import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Deda — Learn Alphabets by Play", description: "Georgian alphabet for Russian speakers" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru"><body><div className="min-h-screen bg-[#020617] text-white">{children}</div></body></html>
  );
}
