import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recruiting App",
  description: "Recruiting pipeline and hiring management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
