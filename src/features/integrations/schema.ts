import { z } from "zod";

/** Подключение Search Console. */
export const connectGscSchema = z.object({
  siteUrl: z.string().min(1).max(500),
  accountId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
});
export type ConnectGscInput = z.infer<typeof connectGscSchema>;

/** Подключение Google Ads. */
export const connectGoogleAdsSchema = z.object({
  customerId: z.string().min(1).max(60),
  managerCustomerId: z.string().max(60).nullable(),
  currency: z.string().min(1).max(10),
  displayName: z.string().min(1).max(200),
});
export type ConnectGoogleAdsInput = z.infer<typeof connectGoogleAdsSchema>;

/** Подключение Meta Ads. */
export const connectMetaAdsSchema = z.object({
  adAccountId: z.string().min(1).max(60),
  businessId: z.string().max(60).nullable(),
  currency: z.string().min(1).max(10),
  displayName: z.string().min(1).max(200),
});
export type ConnectMetaAdsInput = z.infer<typeof connectMetaAdsSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };
