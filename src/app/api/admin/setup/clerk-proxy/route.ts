import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { verifyCronSecret } from "@/lib/cron/auth";

/**
 * One-time (idempotent) operational endpoint: tells Clerk to proxy its
 * Frontend API through this app's own domain (`/api/__clerk`, handled by
 * src/middleware.ts's `frontendApiProxy`) instead of Clerk's CNAME
 * subdomain. This must be run once against each Clerk instance (i.e. once
 * per environment) after deploying the proxy code, because Clerk's
 * "proxying enabled" flag is an account-level setting on the domain, not
 * something `next.config.mjs` env vars alone can turn on.
 *
 * Guarded by CRON_SECRET (same bearer-token pattern as the /api/cron/*
 * routes) rather than admin session auth, since it must be callable via a
 * one-off authenticated request right after a deploy, before any admin
 * session necessarily exists.
 *
 * Safe to leave in place: re-running it just re-confirms the same proxy_url
 * on the domain (a no-op PATCH), and it only ever touches Clerk's own
 * domain configuration — never application data.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      { error: "Clerk Frontend API proxying is only supported for production instances." },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not set; cannot derive the proxy URL." },
      { status: 500 },
    );
  }
  const proxyUrl = `${appUrl.replace(/\/$/, "")}/api/__clerk`;

  const client = await clerkClient();
  const { data: domains } = await client.domains.list();
  const primaryDomain = domains.find((domain) => !domain.isSatellite);
  if (!primaryDomain) {
    return NextResponse.json(
      { error: "No primary Clerk domain found for this instance." },
      { status: 500 },
    );
  }

  const updated = await client.domains.update({
    domainId: primaryDomain.id,
    proxy_url: proxyUrl,
  });

  return NextResponse.json({
    domainId: updated.id,
    name: updated.name,
    proxyUrl: updated.proxyUrl,
    frontendApiUrl: updated.frontendApiUrl,
  });
}
