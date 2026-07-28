import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import NextTopLoader from "nextjs-toploader";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="en" className={plusJakarta.variable}>
      <body className="relative font-sans antialiased">
        <NextTopLoader color="#1d4ed8" height={3} showSpinner={false} />
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

  // The proxy is only needed in production where clerk.<domain> has an SSL cert
  // gap on Replit.  In dev, Clerk's FAPI is directly reachable; routing through
  // the proxy causes 400s because the ephemeral *.replit.dev domain isn't
  // registered with the Clerk dev instance.
  let proxyUrl: string | undefined;
  if (process.env.NODE_ENV === "production") {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    if (host) {
      proxyUrl = `https://${host}/api/clerk`;
    }
  }

  return (
    <ClerkProvider proxyUrl={proxyUrl} appearance={clerkAppearance}>
      {body}
    </ClerkProvider>
  );
}
