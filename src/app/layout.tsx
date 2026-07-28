import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { AppDotSpotlight } from "@/components/layout/app-dot-spotlight";
import { AppToaster } from "@/components/ui/app-toaster";
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
        <NextTopLoader color="#1d4ed8" height={3} showSpinner={false} />
        <AppToaster />
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

  // In production the NEXT_PUBLIC_APP_URL secret is set to the published domain
  // (e.g. https://ffl-capital.replit.app).  We route all Clerk FAPI calls through
  // /api/__clerk on the same domain so the browser never touches the broken
  // clerk.ffl-capital.replit.app subdomain (SSL cert mismatch on Replit).
  // In dev NEXT_PUBLIC_APP_URL is empty so proxyUrl stays undefined and Clerk
  // talks directly to the dev FAPI — which works fine.
  // Only activate the proxy on the published production domain.
  // In dev the Clerk FAPI works fine with direct calls; running it through a
  // proxy the dev instance doesn't know about causes 400s.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const isProductionDomain =
    !!appUrl && !appUrl.includes(".replit.dev") && !appUrl.includes("localhost");
  const proxyUrl = isProductionDomain ? `${appUrl}/api/clerk` : undefined;

  return (
    <ClerkProvider proxyUrl={proxyUrl} appearance={clerkAppearance}>
      {body}
    </ClerkProvider>
  );
}
