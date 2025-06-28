import { z } from "zod";

/* ---------- enums ---------- */

export const ModeEnum = z.enum(["aggregate", "pages"]);

/* ---------- basic types for core functionality ---------- */

export const ProgressEvent = z.object({
  type: z.literal("progress"),
  url: z.string(),
  bytes: z.number().int().nonnegative(),
  elapsedMs: z.number().int().nonnegative(),
  fetched: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
});

export const PageObject = z.object({
  path: z.string(),
  markdown: z.string(),
});

export type TProgressEvent = z.infer<typeof ProgressEvent>;