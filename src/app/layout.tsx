import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Logóteszt | Brandguide",
  description: "Értékeld a logódat szakmai szempontok szerint! A Brandguide 100 pontos rendszere objektív visszajelzést ad arculatodról.",
  keywords: ["logó", "arculat", "brand", "értékelés", "teszt", "brandguide"],
  openGraph: {
    title: "Logóteszt | Brandguide",
    description: "Értékeld a logódat szakmai szempontok szerint!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
