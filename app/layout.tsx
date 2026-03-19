import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RedEng — Reddit Hinglish to English Translator",
  description:
    "Translate Hindi/Hinglish Reddit posts and comments to natural English. Handles code-switching, internet slang, and mixed languages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-[#030303] text-[#d7dadc] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
