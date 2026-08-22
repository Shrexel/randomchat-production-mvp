import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RandomChat",
  description: "Random 1-to-1 text and video chat"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
