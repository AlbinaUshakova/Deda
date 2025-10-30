import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Deda — Learn Alphabets by Play", description: "Georgian alphabet for Russian speakers" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru"><body><div className="mx-auto max-w-6xl px-4 py-6">{children}</div></body></html>
  );
}
