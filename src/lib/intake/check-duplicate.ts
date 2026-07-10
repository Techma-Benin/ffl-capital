import { prisma } from "@/lib/db";
import {
  getDuplicateCheckWindowDays,
  isDuplicateCheckEnabled,
} from "@/lib/settings/app-settings";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  existingLeadId?: string;
}

export async function checkDuplicateLead(
  externalId: string | null,
  email: string,
  phone: string,
): Promise<DuplicateCheckResult> {
  if (externalId) {
    const byExternal = await prisma.lead.findFirst({
      where: { externalId },
      select: { id: true },
    });
    if (byExternal) {
      return {
        isDuplicate: true,
        reason: "external_id",
        existingLeadId: byExternal.id,
      };
    }
  }

  const enabled = await isDuplicateCheckEnabled();
  if (!enabled) return { isDuplicate: false };

  const windowDays = await getDuplicateCheckWindowDays();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const normalizedPhone = phone.replace(/\D/g, "");
  const existing = await prisma.lead.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      createdAt: { gte: windowStart },
    },
    select: { id: true, phone: true },
  });

  if (existing) {
    const existingDigits = existing.phone.replace(/\D/g, "");
    if (existingDigits === normalizedPhone || normalizedPhone.length === 0) {
      return {
        isDuplicate: true,
        reason: "email_phone",
        existingLeadId: existing.id,
      };
    }
  }

  return { isDuplicate: false };
}

export async function findLeadByExternalId(externalId: string) {
  return prisma.lead.findFirst({ where: { externalId } });
}
