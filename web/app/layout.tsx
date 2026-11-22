import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://upkept.app"),
  title: { default: "Upkept: everything that expires, handled", template: "%s · Upkept" },
  description: "Track every document, policy, warranty and subscription. Get reminded in time and get it renewed.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top"><a href="/" className="brand">Upkept</a><a href="/guides">Guides</a></header>
        {children}
      </body>
    </html>
  );
}
