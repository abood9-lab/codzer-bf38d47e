import { createFileRoute } from "@tanstack/react-router";
import type { ExecutionMode, ProviderId } from "@/lib/types";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/chat/")({
  validateSearch: (search: Record<string, unknown>): { prompt?: string; provider?: ProviderId; model?: string; mode?: ExecutionMode } => ({
    ...(typeof search["prompt"] === "string" ? { prompt: search["prompt"] } : {}),
    ...(search["provider"] === "lovable" || search["provider"] === "openrouter" || search["provider"] === "groq" || search["provider"] === "gemini" ? { provider: search["provider"] } : {}),
    ...(typeof search["model"] === "string" ? { model: search["model"] } : {}),
    ...(search["mode"] === "build" || search["mode"] === "plan" ? { mode: search["mode"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Workspace — Whiterchat" },
      { name: "description", content: "Chat with Whiterchat AI and build web apps in real time." },
      { property: "og:title", content: "Workspace — Whiterchat" },
      { property: "og:description", content: "Chat with Whiterchat AI and build web apps in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const { prompt, provider, model, mode } = Route.useSearch();
  return (
    <ChatWorkspace
      {...(prompt ? { initialPrompt: prompt } : {})}
      {...(provider ? { initialProvider: provider } : {})}
      {...(model ? { initialModel: model } : {})}
      {...(mode ? { initialMode: mode } : {})}
    />
  );
}