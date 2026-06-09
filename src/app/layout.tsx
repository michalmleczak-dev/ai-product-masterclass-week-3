import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Suspense } from "react";

import { AuthGate } from "@/components/AuthGate";
import { LayoutShell } from "@/components/LayoutShell";
import { TherapistPanel } from "@/components/TherapistPanel";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mood Journal",
  description: "Log your mood and a short reflection each day.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-foreground`}>
        <AuthGate>
          <LayoutShell>{children}</LayoutShell>
          <Suspense fallback={null}>
            <TherapistPanel />
          </Suspense>
        </AuthGate>
      </body>
    </html>
  );
}
