import { createFileRoute } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — Whiterchat" },
      { name: "description", content: "Continue your AI coding session in Whiterchat." },
      { property: "og:title", content: "Conversation — Whiterchat" },
      { property: "og:description", content: "Continue your AI coding session in Whiterchat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatDetailPage,
});

function ChatDetailPage() {
  const { id } = Route.useParams();
  return <ChatWorkspace chatId={id} />;
}