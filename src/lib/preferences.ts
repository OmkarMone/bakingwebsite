import { z } from "zod";
import { APPLIANCES, SWEETNESS } from "@/lib/types";

/** Stored per anonymous profile. Only an area label is ever stored — never coordinates. */
export const PreferencesSchema = z.object({
  eggless: z.boolean().nullable().default(null),
  vegan: z.boolean().nullable().default(null),
  glutenFree: z.boolean().nullable().default(null),
  sweetness: z.enum(SWEETNESS).nullable().default(null),
  appliance: z.enum(APPLIANCES).nullable().default(null),
  preferredWeightGrams: z.number().int().min(150).max(10000).nullable().default(null),
  equipment: z.array(z.string().trim().max(60)).max(20).default([]),
  preferredStores: z.array(z.string().trim().max(60)).max(10).default([]),
  defaultArea: z.string().trim().max(160).nullable().default(null),
  defaultCountryCode: z.string().trim().length(2).nullable().default(null),
});
export type Preferences = z.infer<typeof PreferencesSchema>;
