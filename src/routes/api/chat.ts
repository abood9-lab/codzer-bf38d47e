import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { streamChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import { z } from "zod";

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(60000),
      }),
    )
    .min(1)
    .max(60),
  provider: z.enum(["lovable", "openrouter", "groq", "gemini"]).default("lovable"),
  model: z.string().max(128).optional(),
  mode: z.enum(["build", "plan"]).default("build"),
});

function buildSystemPrompt(mode: "build" | "plan"): string {
  if (mode === "plan") {
    return [
      "You are Whiterchat, a senior full-stack software architect.",
      "The user is in PLAN mode. Produce a clear, structured implementation plan with:",
      "1. Architecture & Pages",
      "2. Data Model & Security",
      "3. Step-by-step Build Checklist",
      "Respond in the same language the user writes in. Do not emit code files until they switch to Build mode.",
    ].join("\n");
  }

  return [
    "You are Whiterchat, an expert AI full-stack web developer.",
    "Respond concisely in the user's language.",
    "Whenever you create or edit web application code, wrap the files inside a <boltArtifact id=\"app\" title=\"App Title\"> block using <boltAction type=\"file\" filePath=\"index.html\">...</boltAction>, <boltAction type=\"file\" filePath=\"styles.css\">...</boltAction>, and <boltAction type=\"file\" filePath=\"app.js\">...</boltAction>.",
    "Ensure index.html is complete, modern, visually polished, responsive, and works directly in a browser preview.",
  ].join("\n");
}

async function verifyCaller(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return false;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return false;

  const client = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

async function streamOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "Upstream provider error");
    return Response.json({ error: errText.slice(0, 300) }, { status: upstream.status || 502 });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore malformed SSE fragment
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorized = await verifyCaller(request);
        if (!authorized) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }

        let parsedBody: z.infer<typeof ChatRequestSchema>;
        try {
          parsedBody = ChatRequestSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid chat request payload" }, { status: 400 });
        }

        const systemPrompt = buildSystemPrompt(parsedBody.mode);
        const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
          ...parsedBody.messages,
        ];

        if (parsedBody.provider === "openrouter") {
          const key = process.env["OPENROUTER_API_KEY"]?.trim();
          if (key) {
            return streamOpenAICompatible(
              "https://openrouter.ai/api/v1/chat/completions",
              key,
              parsedBody.model || "openrouter/free",
              fullMessages,
              { "X-Title": "Whiterchat" },
            );
          }
        }

        if (parsedBody.provider === "groq") {
          const key = process.env["GROQ_API_KEY"]?.trim();
          if (key) {
            return streamOpenAICompatible(
              "https://api.groq.com/openai/v1/chat/completions",
              key,
              parsedBody.model || "llama-3.3-70b-versatile",
              fullMessages,
            );
          }
        }

        if (parsedBody.provider === "gemini") {
          const key = process.env["GEMINI_API_KEY"]?.trim();
          if (key) {
            const geminiModel = parsedBody.model || "gemini-2.5-flash";
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(key)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  contents: parsedBody.messages.map((m) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                  })),
                }),
              },
            );
            if (!res.ok) {
              return Response.json({ error: "Gemini provider request failed" }, { status: res.status });
            }
            const data = (await res.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
            return new Response(text, {
              headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
            });
          }
        }

        try {
          const gatewayStream = await streamChatCompletion({
            model: "openai/gpt-6.1-terra",
            messages: fullMessages,
          });

          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const event of gatewayStream) {
                  const delta = event.choices?.[0]?.delta?.content;
                  if (typeof delta === "string" && delta.length > 0) {
                    controller.enqueue(encoder.encode(delta));
                  }
                }
              } catch (err) {
                const msg = err instanceof GatewayError ? err.message : "Stream interrupted";
                controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
              } finally {
                controller.close();
              }
            },
          });

          return new Response(readable, {
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        } catch (err) {
          console.error("[api/chat]", err);
          const msg = err instanceof GatewayError ? err.message : "Failed to generate response";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});