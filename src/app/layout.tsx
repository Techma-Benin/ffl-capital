import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";
import { isClerkConfigured } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "FFL Capital — Lead Distribution",
  description: "Internal lead distribution platform for FFL Capital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );

  if (!isClerkConfigured()) {
    return body;
  }

  return <ClerkProvider>{body}</ClerkProvider>;
}
