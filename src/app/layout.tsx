import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "stratTrack", description: "strategy rules engine and track record" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
