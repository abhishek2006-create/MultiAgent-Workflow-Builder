import "./globals.css";
import "./studio.css";
import type { Metadata } from "next";
import { TopNav } from "../components/layout/Topbar";
import SiteMotion from "../components/layout/SiteMotion";

export const metadata: Metadata = {
  title: "FlowForge AI",
  description: "Design connected AI workflows with agents, tools and human approval. Intelligence, orchestrated.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteMotion>
          <TopNav />
          <main id="app" tabIndex={-1}>{children}</main>
        </SiteMotion>
      </body>
    </html>
  );
}
