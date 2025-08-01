import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Auth0Provider from "@/lib/auth0-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EverJust.dev - AI-Powered Development Platform",
  description: "Build, deploy, and manage your projects with AI assistance from Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}