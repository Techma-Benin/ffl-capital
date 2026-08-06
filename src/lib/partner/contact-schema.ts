import { z } from "zod";
import { CONTACT_TOPIC_VALUES } from "@/lib/partner/contact-topics";

export const partnerContactSchema = z
  .object({
    topic: z.enum(CONTACT_TOPIC_VALUES),
    message: z.string().trim().min(1).max(10_000),
    customTopic: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.topic === "other" && (!data.customTopic || data.customTopic.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom topic is required when topic is other",
        path: ["customTopic"],
      });
    }
  });
