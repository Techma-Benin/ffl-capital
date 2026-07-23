import dns from "node:dns/promises";
import net from "node:net";

export class OutboundUrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundUrlGuardError";
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

export function isBlockedIpAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function assertAllowedOutboundUrlProtocol(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new OutboundUrlGuardError("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new OutboundUrlGuardError("URL must not contain credentials");
  }
}

export async function validateOutboundEndpointUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new OutboundUrlGuardError("Invalid URL");
  }

  assertAllowedOutboundUrlProtocol(url);

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new OutboundUrlGuardError("Local hostnames are not allowed");
  }

  if (net.isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new OutboundUrlGuardError("Private or loopback IP addresses are blocked");
    }
    return;
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new OutboundUrlGuardError("Could not resolve hostname");
  }

  if (records.length === 0) {
    throw new OutboundUrlGuardError("Could not resolve hostname");
  }

  for (const record of records) {
    if (isBlockedIpAddress(record.address)) {
      throw new OutboundUrlGuardError(
        `Hostname resolves to blocked address: ${record.address}`,
      );
    }
  }
}

export function endpointHostForDisplay(rawUrl: string): string {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "unknown";
  }
}
