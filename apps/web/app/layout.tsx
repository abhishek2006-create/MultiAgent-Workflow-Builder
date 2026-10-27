import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "../components/layout/Topbar";
import SiteMotion from "../components/layout/SiteMotion";

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
        <SiteMotion>
          <TopNav />
          <main id="app">{children}</main>
        </SiteMotion>
      </body>
    </html>
  );
}
