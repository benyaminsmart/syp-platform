import { z } from "zod";

export const claimSchema = z.object({
  creator_id: z.string().uuid("Invalid creator ID"),
  user_id: z.string().uuid("Invalid user ID"),
  verification_code: z.string().min(6, "Code too short").max(100, "Code too long"), // افزایش طول مجاز
  story_proof_url: z.string().url("Invalid URL").optional().nullable(),
});

export const bookingSchema = z.object({
  creator_id: z.string().uuid("Invalid creator ID"),
  package_id: z.string().uuid("Invalid package ID").optional().nullable(),
  brand_email: z.string().email("Invalid email address").max(100, "Email too long"),
  brand_name: z.string().min(2, "Brand name too short").max(50, "Brand name too long"),
  campaign_brief: z.string().min(10, "Brief too short").max(1000, "Brief too long"),
  budget: z.number().positive("Budget must be positive").max(100000, "Budget too high"),
  idempotency_key: z.string().uuid("Invalid idempotency key").nullable().optional(),
});
