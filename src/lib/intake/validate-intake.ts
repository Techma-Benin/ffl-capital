import { z } from "zod";

/** Accepts Boberdoo-style field names (underscores) from LeadConduit webhook. */
export const intakePayloadSchema = z
  .object({
    First_Name: z.string().min(1).optional(),
    Last_Name: z.string().min(1).optional(),
    Email: z.string().email().optional(),
    Primary_Phone: z.string().min(1).optional(),
    State: z.string().length(2).optional(),
    State_You_Currently_Live_In: z.string().length(2).optional(),
    Intent: z.string().optional(),
    Trusted_Form_URL: z.string().url().optional(),
    Unique_Identifier: z.string().optional(),
    SRC: z.string().optional(),
    Lead_Type: z.string().optional(),
    // camelCase fallbacks for dev simulator
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    state: z.string().length(2).optional(),
    intent: z.string().optional(),
    trustedformCertUrl: z.string().url().optional(),
    externalId: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough()
  .refine(
    (data) => {
      const firstName = data.First_Name ?? data.firstName;
      const lastName = data.Last_Name ?? data.lastName;
      const email = data.Email ?? data.email;
      const phone = data.Primary_Phone ?? data.phone;
      const state =
        data.State ?? data.State_You_Currently_Live_In ?? data.state;
      return !!(firstName && lastName && email && phone && state);
    },
    {
      message:
        "Missing required fields: firstName, lastName, email, phone, state",
    },
  );

export type IntakePayload = z.infer<typeof intakePayloadSchema>;

export const leadConduitResponseSchema = z.object({
  outcome: z.enum(["success", "error"]),
  reason: z.string(),
});

export type LeadConduitResponse = z.infer<typeof leadConduitResponseSchema>;
