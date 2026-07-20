/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Schedules the IntegrityConnect post cron (every 15 minutes) so it
 * runs in-process without any external scheduler or HTTP self-call.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge, not during builds)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS ?? "", 10) || 15 * 60 * 1000; // default 15 min, override via env

  async function runIntegrityPostCron() {
    try {
      const { prisma } = await import("@/lib/db");
      const { LeadStatus } = await import("@prisma/client");
      const { integrityPostLead } = await import("@/lib/integrity/post");
      const { getIntegrityPostDelayHours } = await import(
        "@/lib/settings/app-settings"
      );

      const delayHours = await getIntegrityPostDelayHours();
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - delayHours);

      const leads = await prisma.lead.findMany({
        where: {
          status: LeadStatus.unmatched,
          available: true,
          receivedAt: { lte: cutoff },
        },
        take: 25,
      });

      let posted = 0;
      const errors: string[] = [];

      for (const lead of leads) {
        const result = await integrityPostLead(lead.id);
        if (result.posted) posted++;
        else if (result.reason) errors.push(`${lead.id}: ${result.reason}`);
      }

      console.info("[cron] integrity-post:", { attempted: leads.length, posted, errors });
    } catch (err) {
      console.error("[cron] integrity-post failed:", err);
    }
  }

  // Guard against overlapping runs on the same instance.
  let cronRunning = false;
  async function guardedCronRun() {
    if (cronRunning) {
      console.warn("[cron] integrity-post: previous run still in progress, skipping");
      return;
    }
    cronRunning = true;
    try {
      await runIntegrityPostCron();
    } finally {
      cronRunning = false;
    }
  }

  setInterval(guardedCronRun, INTERVAL_MS);

  console.info(
    `[cron] integrity-post scheduler registered (every ${INTERVAL_MS / 60000} min)`,
  );
}
