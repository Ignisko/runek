import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Runek | Faith-Based Service Engine",
  description: "Compassionate, faith-driven vocational engine to help find roles that serve people in pain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen overflow-x-hidden transition-colors duration-300 flex flex-col">
        <main className="relative flex-1 flex flex-col">
          {children}
        </main>
        <footer style={{ padding: "24px", textAlign: "center", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-base)" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
            <a href="/privacy" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Terms</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
