import { createFileRoute } from "@tanstack/react-router";
import type { ExecutionMode, ProviderId } from "@/lib/types";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/chat/")({
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search["prompt"] === "string" ? search["prompt"] : undefined,
    provider:
      search["provider"] === "lovable" ||
      search["provider"] === "openrouter" ||
      search["provider"] === "groq" ||
      search["provider"] === "gemini"
        ? (search["provider"] as ProviderId)
        : undefined,
    model: typeof search["model"] === "string" ? search["model"] : undefined,
    mode:
      search["mode"] === "build" || search["mode"] === "plan"
        ? (search["mode"] as ExecutionMode)
        : undefined,
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
      initialPrompt={prompt}
      initialProvider={provider}
      initialModel={model}
      initialMode={mode}
    />
  );
}