import { createFileRoute } from "@tanstack/react-router";
import type { ModelsApiResponse, ProviderCatalog } from "@/lib/types";

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        const openRouterKey = process.env["OPENROUTER_API_KEY"]?.trim();
        const groqKey = process.env["GROQ_API_KEY"]?.trim();
        const geminiKey = process.env["GEMINI_API_KEY"]?.trim();

        const providers: ProviderCatalog[] = [
          {
            id: "lovable",
            name: "Lovable AI",
            configured: true,
            defaultModel: "openai/gpt-6.1-terra",
            source: "live",
            models: [
              {
                id: "openai/gpt-6.1-terra",
                name: "GPT-6.1 Terra",
                provider: "lovable",
                description: "Built-in full-stack coding and reasoning model ready out of the box.",
                contextLength: 256000,
                pricing: "Included",
                isFree: true,
                categories: ["free", "coding", "reasoning"],
                capabilities: ["Built-in", "Coding", "Reasoning", "Long Context"],
              },
            ],
          },
          {
            id: "openrouter",
            name: "OpenRouter",
            configured: Boolean(openRouterKey),
            defaultModel: "openrouter/free",
            source: "fallback",
            models: [
              {
                id: "openrouter/free",
                name: "OpenRouter Auto Free",
                provider: "openrouter",
                description: "Routes automatically to available free OpenRouter models.",
                contextLength: 128000,
                pricing: "Free",
                isFree: true,
                categories: ["free", "coding"],
                capabilities: ["Free", "Coding"],
              },
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude Sonnet 4",
                provider: "openrouter",
                description: "High-precision architecture and full-stack code generation.",
                contextLength: 200000,
                pricing: "$3 / $15 per 1M",
                isFree: false,
                categories: ["coding", "reasoning"],
                capabilities: ["Coding", "Reasoning", "Long Context"],
              },
              {
                id: "deepseek/deepseek-r1:free",
                name: "DeepSeek R1 (Free)",
                provider: "openrouter",
                description: "Strong reasoning model for complex debugging and planning.",
                contextLength: 128000,
                pricing: "Free",
                isFree: true,
                categories: ["free", "reasoning", "coding"],
                capabilities: ["Free", "Reasoning", "Coding"],
              },
            ],
          },
          {
            id: "groq",
            name: "Groq",
            configured: Boolean(groqKey),
            defaultModel: "llama-3.3-70b-versatile",
            source: "fallback",
            models: [
              {
                id: "llama-3.3-70b-versatile",
                name: "Llama 3.3 70B Versatile",
                provider: "groq",
                description: "Ultra-low latency inference for rapid prototyping.",
                contextLength: 128000,
                pricing: "$0.59 / $0.79 per 1M",
                isFree: false,
                categories: ["coding", "fast"],
                capabilities: ["Fast", "Coding", "Long Context"],
              },
              {
                id: "llama-3.1-8b-instant",
                name: "Llama 3.1 8B Instant",
                provider: "groq",
                description: "Sub-second responses for quick edits and prompt refinement.",
                contextLength: 128000,
                pricing: "$0.05 / $0.08 per 1M",
                isFree: false,
                categories: ["fast"],
                capabilities: ["Fast"],
              },
            ],
          },
          {
            id: "gemini",
            name: "Google Gemini",
            configured: Boolean(geminiKey),
            defaultModel: "gemini-2.5-flash",
            source: "fallback",
            models: [
              {
                id: "gemini-2.5-flash",
                name: "Gemini 2.5 Flash",
                provider: "gemini",
                description: "Fast multimodal coding model with 1M context window.",
                contextLength: 1000000,
                pricing: "Free tier / Pay-as-you-go",
                isFree: true,
                categories: ["free", "fast", "coding"],
                capabilities: ["Fast", "Coding", "Long Context"],
              },
              {
                id: "gemini-2.5-pro",
                name: "Gemini 2.5 Pro",
                provider: "gemini",
                description: "Deep reasoning and multi-file architecture synthesis.",
                contextLength: 1000000,
                pricing: "Pay-as-you-go",
                isFree: false,
                categories: ["coding", "reasoning"],
                capabilities: ["Coding", "Reasoning", "Long Context"],
              },
            ],
          },
        ];

        const payload: ModelsApiResponse = {
          providers,
          fetchedAt: new Date().toISOString(),
        };

        return Response.json(payload, {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});