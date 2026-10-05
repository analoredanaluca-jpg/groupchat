import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Roommate — Găsește-ți colegul de cameră",
  description: "O platformă simplă pentru găsirea unui coleg de cameră compatibil.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<footer className="border-t border-[#173f35]/10 bg-[#fbfaf7] px-6 py-4 text-center text-xs text-slate-500"><a href="/privacy" className="underline underline-offset-4 hover:text-[#173f35]">Confidențialitate · exportă sau șterge datele</a></footer></body>
    </html>
  );
}
