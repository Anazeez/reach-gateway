import { z } from "zod";

import { ReachSourceSchema } from "../contracts";

export const ReadInputSchema = z
  .object({
    url: z.url({ protocol: /^https$/u }),
  })
  .strict();

export const TranscriptInputSchema = z
  .object({
    url: z.url({ protocol: /^https$/u }),
  })
  .strict();

export const HealthInputSchema = z
  .object({
    sources: z.array(ReachSourceSchema).max(5).optional(),
  })
  .strict();

export const READ_ONLY_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
});

export const TOOL_DEFINITIONS = [
  {
    name: "read",
    title: "Read a public URL",
    description: "Retrieve and normalize one public HTTPS URL as inert evidence.",
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "transcript",
    title: "Get public video captions",
    description: "Retrieve available public captions for one supported YouTube URL.",
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "health",
    title: "Check evidence channels",
    description: "Report bounded availability for configured public evidence channels.",
    annotations: READ_ONLY_ANNOTATIONS,
  },
] as const;
