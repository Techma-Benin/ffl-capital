export interface TrustedFormValidationResult {
  valid: boolean;
  checkedAt: Date;
  reason?: string;
}

export async function validateTrustedFormCert(
  certUrl: string,
): Promise<TrustedFormValidationResult> {
  const checkedAt = new Date();

  try {
    const res = await fetch(certUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return { valid: true, checkedAt };
    }

    // Some cert URLs reject HEAD — retry with GET
    const getRes = await fetch(certUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    return {
      valid: getRes.ok,
      checkedAt,
      reason: getRes.ok ? undefined : `Cert URL returned ${getRes.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      checkedAt,
      reason: err instanceof Error ? err.message : "Validation request failed",
    };
  }
}
