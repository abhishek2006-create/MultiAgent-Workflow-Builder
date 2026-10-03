// @ts-ignore - CSS side-effect imports are handled by Next.js
import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "../components/layout/Topbar";

export const metadata: Metadata = {
  title: "FlowForge AI",
  description: "AI workflow automation builder",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main id="app">{children}</main>
      </body>
    </html>
  );
}
