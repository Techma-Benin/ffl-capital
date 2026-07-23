import type { PartnerCrmOutboundConfig } from "@prisma/client";
import {
  parseSuccessRule,
  type CrmOutboundSuccessRule,
} from "@/lib/crm-outbound/schemas";
import type { CrmOutboundFieldMapping } from "@/lib/crm-outbound/schemas";
import {
  buildFlatOutboundPayload,
  mergeBodyFieldAuth,
} from "./outbound-payload";
import { validateOutboundEndpointUrl } from "./outbound-url-guard";

export const OUTBOUND_FETCH_TIMEOUT_MS = 15_000;
export const OUTBOUND_MAX_RESPONSE_BYTES = 256 * 1024;

export interface OutboundPostResult {
  ok: boolean;
  statusCode?: number;
  bodyPreview?: string;
  error?: string;
  successRuleFailed?: string;
}

export function evaluateSuccessRule(
  statusCode: number,
  bodyText: string,
  ruleInput: CrmOutboundSuccessRule | unknown,
): { ok: true } | { ok: false; reason: string } {
  const rule = parseSuccessRule(ruleInput);
  const require2xx = rule.require2xx !== false;

  if (require2xx && (statusCode < 200 || statusCode >= 300)) {
    return { ok: false, reason: `HTTP ${statusCode} (expected 2xx)` };
  }

  if (rule.bodyContains && !bodyText.includes(rule.bodyContains)) {
    return {
      ok: false,
      reason: `Response body does not contain "${rule.bodyContains}"`,
    };
  }

  if (rule.bodyRegex) {
    let re: RegExp;
    try {
      re = new RegExp(rule.bodyRegex);
    } catch {
      return { ok: false, reason: "Invalid bodyRegex in success rule" };
    }
    if (!re.test(bodyText)) {
      return { ok: false, reason: "Response body did not match bodyRegex" };
    }
  }

  if (rule.bodyKeyEquals) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return { ok: false, reason: "Response is not JSON (bodyKeyEquals rule)" };
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ok: false, reason: "Response JSON is not a flat object" };
    }
    const obj = parsed as Record<string, unknown>;
    const actual = obj[rule.bodyKeyEquals.key];
    const expected = rule.bodyKeyEquals.value;
    if (String(actual ?? "") !== expected) {
      return {
        ok: false,
        reason: `Top-level key "${rule.bodyKeyEquals.key}" did not equal expected value`,
      };
    }
  }

  return { ok: true };
}

export function truncateBodyPreview(body: string, max = 500): string {
  if (body.length <= max) return body;
  return `${body.slice(0, max)}…`;
}

function buildAuthHeaders(
  config: Pick<PartnerCrmOutboundConfig, "authType" | "authConfig">,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
  };

  const authConfig = config.authConfig as Record<string, unknown>;

  switch (config.authType) {
    case "bearer": {
      const token = authConfig.token;
      if (typeof token === "string" && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      break;
    }
    case "api_key_header": {
      const headerName = authConfig.headerName;
      const headerValue = authConfig.headerValue;
      if (typeof headerName === "string" && typeof headerValue === "string") {
        headers[headerName] = headerValue;
      }
      break;
    }
    case "basic": {
      const username = authConfig.username;
      const password = authConfig.password;
      if (typeof username === "string" && typeof password === "string") {
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        headers.Authorization = `Basic ${encoded}`;
      }
      break;
    }
    default:
      break;
  }

  return headers;
}

export async function postPartnerCrmOutbound(
  config: PartnerCrmOutboundConfig,
  sourcePayload: Record<string, unknown>,
): Promise<OutboundPostResult> {
  try {
    await validateOutboundEndpointUrl(config.endpointUrl);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "URL validation failed",
    };
  }

  const mappings = config.fieldMappings as CrmOutboundFieldMapping[];
  let body = buildFlatOutboundPayload(sourcePayload, mappings);
  body = mergeBodyFieldAuth(body, config.authType, config.authConfig);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OUTBOUND_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(config.endpointUrl, {
      method: config.httpMethod,
      headers: buildAuthHeaders(config),
      body: JSON.stringify(body),
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : "Network error";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > OUTBOUND_MAX_RESPONSE_BYTES) {
    return {
      ok: false,
      statusCode: res.status,
      error: "Response body too large",
    };
  }

  const bodyText = new TextDecoder().decode(buffer);
  const preview = truncateBodyPreview(bodyText);

  const ruleResult = evaluateSuccessRule(
    res.status,
    bodyText,
    config.successRule,
  );

  if (!ruleResult.ok) {
    return {
      ok: false,
      statusCode: res.status,
      bodyPreview: preview,
      error: ruleResult.reason,
      successRuleFailed: ruleResult.reason,
    };
  }

  return { ok: true, statusCode: res.status, bodyPreview: preview };
}
