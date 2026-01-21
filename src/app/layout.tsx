import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/layout/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ForgeStudy Platform",
  description: "AI study companion for Grades 6–12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-clinical-bg text-clinical-text-primary`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}