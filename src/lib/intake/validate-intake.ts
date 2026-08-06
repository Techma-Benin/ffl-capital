import { z } from "zod";

const optionalString = z.string().optional();

/** Accepts Boberdoo-style field names (underscores) from LeadConduit webhook. */
export const intakePayloadSchema = z
  .object({
    // Contact
    First_Name: z.string().min(1).optional(),
    Last_Name: z.string().min(1).optional(),
    Email: z.string().email().optional(),
    Primary_Phone: z.string().min(1).optional(),
    Address: optionalString,
    City: optionalString,
    State: z.string().length(2).optional(),
    Zip: optionalString,
    DOB: optionalString,
    Age: optionalString,
    // IUL business
    Have_IUL: optionalString,
    Primary_Goal: optionalString,
    State_You_Currently_Live_In: z.string().length(2).optional(),
    Intent: optionalString,
    // Compliance
    Trusted_Form_URL: z.string().url().optional(),
    TCPA_Consent: optionalString,
    TCPA_Language: optionalString,
    LeadiD_Token: optionalString,
    // Tracking / attribution
    SRC: optionalString,
    Landing_Page: optionalString,
    Sub_ID: optionalString,
    Pub_ID: optionalString,
    Unique_Identifier: optionalString,
    Lead_Type: optionalString,
    IP_Address: optionalString,
    User_Agent: optionalString,
    // camelCase fallbacks for dev simulator
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    address: optionalString,
    city: optionalString,
    state: z.string().length(2).optional(),
    zip: optionalString,
    dob: optionalString,
    age: optionalString,
    haveIul: optionalString,
    primaryGoal: optionalString,
    stateYouCurrentlyLiveIn: z.string().length(2).optional(),
    intent: optionalString,
    trustedformCertUrl: z.string().url().optional(),
    tcpaConsent: optionalString,
    tcpaLanguage: optionalString,
    leadidToken: optionalString,
    source: optionalString,
    landingPage: optionalString,
    subId: optionalString,
    pubId: optionalString,
    externalId: optionalString,
    leadTypeBoberdoo: optionalString,
    boberdooLeadType: optionalString,
    ipAddress: optionalString,
    userAgent: optionalString,
  })
  .passthrough()
  .refine(
    (data) => {
      const firstName = data.First_Name ?? data.firstName;
      const lastName = data.Last_Name ?? data.lastName;
      const email = data.Email ?? data.email;
      const phone = data.Primary_Phone ?? data.phone;
      const state =
        data.State ??
        data.State_You_Currently_Live_In ??
        data.stateYouCurrentlyLiveIn ??
        data.state;
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
