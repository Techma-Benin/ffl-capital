import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppDotSpotlight } from "@/components/layout/app-dot-spotlight";
import { SolarIconsProvider } from "@/components/providers/solar-icons-provider";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";
import { isClerkConfigured } from "@/lib/auth/roles";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" className={plusJakarta.variable}>
      <body className="relative font-sans antialiased">
        <AppDotSpotlight />
        <div className="relative z-[1]">
          <SolarIconsProvider>{children}</SolarIconsProvider>
        </div>
      </body>
    </html>
  );

  if (!isClerkConfigured()) {
    return body;
  }

  return <ClerkProvider appearance={clerkAppearance}>{body}</ClerkProvider>;
}
