import { z } from "zod";
import { CONTACT_TOPIC_VALUES } from "@/lib/partner/contact-topics";

export const partnerContactSchema = z.object({
  topic: z.enum(CONTACT_TOPIC_VALUES),
  message: z.string().trim().min(1).max(10_000),
});
