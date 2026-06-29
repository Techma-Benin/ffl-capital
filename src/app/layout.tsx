import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FFL Capital — Lead Distribution",
  description: "Internal lead distribution platform for FFL Capital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
