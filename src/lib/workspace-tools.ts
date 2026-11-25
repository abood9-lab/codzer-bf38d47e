import { strToU8, zipSync } from "fflate";
import { inferLanguage } from "@/lib/artifact-parser";
import type { ChatMessage, WorkspaceFile } from "@/lib/types";

export function normalizeFilePath(input: string): string {
  const path = input.trim().replaceAll("\\", "/");
  if (!path || path.startsWith("/") || path.includes(":") || path.split("/").some((part) => !part || part === ".." || part === ".")) {
    throw new Error("Use a relative file path, such as src/app.js");
  }
  if (path.split("/").some((part) => /^\.env(?:\.|$)/i.test(part) || /^(?:credentials|id_rsa|id_ed25519)$/i.test(part)) || /\.(?:pem|key|p12)$/i.test(path)) {
    throw new Error("Private credentials cannot be imported or exported");
  }
  return path;
}

export function makeWorkspaceFile(path: string, content: string): WorkspaceFile {
  const safePath = normalizeFilePath(path);
  return { path: safePath, content, language: inferLanguage(safePath) };
}

export function createProjectZip(files: Record<string, WorkspaceFile>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const file of Object.values(files)) entries[normalizeFilePath(file.path)] = strToU8(file.content);
  return zipSync(entries);
}

export function downloadFile(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function conversationMarkdown(messages: ChatMessage[]): string {
  return messages.map((message) => `## ${message.role === "user" ? "You" : "Whiterchat"}\n\n${message.content}`).join("\n\n---\n\n");
}