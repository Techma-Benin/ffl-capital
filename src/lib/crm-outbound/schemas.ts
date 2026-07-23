import { z } from "zod";

export const crmOutboundAuthTypeSchema = z.enum([
  "none",
  "bearer",
  "api_key_header",
  "basic",
  "body_fields",
]);

export const fieldMappingSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
});

export const successRuleSchema = z.object({
  require2xx: z.boolean().optional(),
  bodyContains: z.string().optional(),
  bodyRegex: z.string().optional(),
  bodyKeyEquals: z
    .object({
      key: z.string().min(1),
      value: z.string(),
    })
    .optional(),
});

const authConfigByType = z.discriminatedUnion("authType", [
  z.object({ authType: z.literal("none"), authConfig: z.object({}).optional() }),
  z.object({
    authType: z.literal("bearer"),
    authConfig: z.object({ token: z.string().min(1) }),
  }),
  z.object({
    authType: z.literal("api_key_header"),
    authConfig: z.object({
      headerName: z.string().min(1),
      headerValue: z.string().min(1),
    }),
  }),
  z.object({
    authType: z.literal("basic"),
    authConfig: z.object({
      username: z.string(),
      password: z.string(),
    }),
  }),
  z.object({
    authType: z.literal("body_fields"),
    authConfig: z.object({
      fields: z.array(z.object({ key: z.string().min(1), value: z.string() })),
    }),
  }),
]);

export const crmOutboundConfigBodySchema = z
  .object({
    enabled: z.boolean(),
    endpointUrl: z.string().url().max(2048),
    httpMethod: z.literal("POST").optional(),
    authType: crmOutboundAuthTypeSchema,
    authConfig: z.record(z.unknown()).optional(),
    fieldMappings: z.array(fieldMappingSchema).min(1),
    successRule: successRuleSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const authCheck = authConfigByType.safeParse({
      authType: data.authType,
      authConfig: data.authConfig ?? {},
    });
    if (!authCheck.success) {
      for (const issue of authCheck.error.issues) {
        ctx.addIssue({ ...issue, path: ["authConfig", ...issue.path.slice(1)] });
      }
    }
  });

export type CrmOutboundConfigInput = z.infer<typeof crmOutboundConfigBodySchema>;
export type CrmOutboundFieldMapping = z.infer<typeof fieldMappingSchema>;
export type CrmOutboundSuccessRule = z.infer<typeof successRuleSchema>;

export function defaultSuccessRule(): CrmOutboundSuccessRule {
  return { require2xx: true };
}

export function parseSuccessRule(raw: unknown): CrmOutboundSuccessRule {
  const parsed = successRuleSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultSuccessRule();
}
