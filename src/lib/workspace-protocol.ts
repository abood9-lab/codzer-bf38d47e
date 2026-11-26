import { z } from "zod";
import { parseArtifactsFromText } from "@/lib/artifact-parser";
import { makeWorkspaceFile } from "@/lib/workspace-tools";
import type { WorkspaceFile } from "@/lib/types";

export const planningQuestionsSchema = z.object({ questions: z.array(z.object({ id: z.string().max(40), question: z.string().min(1).max(500), options: z.array(z.string().max(150)).max(4).default([]) })).min(2).max(5) });
export type PlanningQuestion = z.infer<typeof planningQuestionsSchema>["questions"][number];
export const secretRequestSchema = z.object({ secrets: z.array(z.object({ name: z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/), reason: z.string().max(500) })).min(1).max(10) });
export type SecretRequest = z.infer<typeof secretRequestSchema>["secrets"][number];

export function extractSecretRequests(text: string): SecretRequest[] {
  const body = /<secretRequest>([\s\S]*?)<\/secretRequest>/.exec(text)?.[1];
  if (!body) return [];
  try { return secretRequestSchema.parse(JSON.parse(body)).secrets; } catch { return []; }
}

export function streamedFiles(text: string, completeOnly = false): Record<string, WorkspaceFile> {
  const safe: Record<string, WorkspaceFile> = {};
  const source = completeOnly ? Array.from(text.matchAll(/<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/g), (m) => `<boltArtifact><boltAction${m[1] ?? ""}>${m[2] ?? ""}</boltAction></boltArtifact>`).join("") : text;
  for (const artifact of parseArtifactsFromText(source).artifacts) for (const file of artifact.files) {
    try {
      const content = file.content.replace(/<(?:\/?(?:b(?:o(?:l(?:t(?:A(?:c(?:t(?:i(?:o(?:n)?)?)?)?)?)?)?)?)?)?)?$/, "");
      const next = makeWorkspaceFile(file.path, content); safe[next.path] = next;
    } catch { /* Ignore unsafe AI paths, including credentials. */ }
  }
  return safe;
}

export function visibleAssistantText(text: string): string {
  return text.replace(/<secretRequest>[\s\S]*?(?:<\/secretRequest>|$)/g, "");
}