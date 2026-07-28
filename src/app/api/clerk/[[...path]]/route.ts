/**
 * Clerk FAPI proxy — routes browser Clerk API calls through our own domain so
 * the browser never touches clerk.ffl-capital.replit.app (whose SSL cert
 * doesn't cover the clerk. subdomain — a Replit provisioning gap).
 *
 * Browser calls  /api/clerk/v1/...
 * This handler proxies to  https://<FAPI>/v1/...  server-side.
 * For Replit-hosted FAPI domains we disable cert verification (the server is
 * inside Replit's own private network at 172.x.x.x, so the risk is minimal).
 */

import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";

// Decode the Frontend API host from the publishable key once at module load.
function resolveFapiHost(): string {
  const key =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "";
  if (!key) return "clerk.ffl-capital.replit.app";
  try {
    const b64 = key.replace(/^pk_(test|live)_/, "").replace(/\$/g, "=");
    return Buffer.from(b64, "base64").toString("utf8").replace(/\$?$/, "").trim();
  } catch {
    return "clerk.ffl-capital.replit.app";
  }
}

const FAPI_HOST = resolveFapiHost();
// Replit's clerk. subdomain has an SSL cert that doesn't include it as a SAN.
// We only skip verification when forwarding to those internal hosts.
const INSECURE_AGENT = FAPI_HOST.includes(".replit.")
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const clerkPath = pathname.replace(/^\/api\/clerk/, "") || "/";
  const target = `https://${FAPI_HOST}${clerkPath}${search}`;

  // Build a plain headers object; swap host to the FAPI host
  const forwardedHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") forwardedHeaders[key] = value;
  });
  forwardedHeaders["host"] = FAPI_HOST;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  try {
    // Read the request body as a Buffer so we can pipe it with http.request
    const bodyBuffer = hasBody ? Buffer.from(await req.arrayBuffer()) : null;

    const upstream = await new Promise<{
      status: number;
      headers: Record<string, string | string[]>;
      body: Buffer;
    }>((resolve, reject) => {
      const url = new URL(target);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
          ...forwardedHeaders,
          ...(bodyBuffer ? { "content-length": String(bodyBuffer.length) } : {}),
        },
        agent: INSECURE_AGENT,
      };

      const proxyReq = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 502,
            headers: res.headers as Record<string, string | string[]>,
            body: Buffer.concat(chunks),
          });
        });
        res.on("error", reject);
      });

      proxyReq.on("error", reject);
      if (bodyBuffer) proxyReq.write(bodyBuffer);
      proxyReq.end();
    });

    const responseHeaders = new Headers();
    const skipHeaders = new Set(["connection", "transfer-encoding", "keep-alive"]);
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (skipHeaders.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => responseHeaders.append(key, v));
      } else if (value) {
        responseHeaders.set(key, value);
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[clerk-proxy] upstream error →", target, err);
    return NextResponse.json({ error: "clerk proxy upstream error" }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;

export const runtime = "nodejs";
