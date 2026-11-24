import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import { z } from "zod";

const EnhancerSchema = z.object({
  message: z.string().min(1).max(8000),
});

export const Route = createFileRoute("/api/enhancer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) return Response.json({ error: "Authentication required" }, { status: 401 });

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return Response.json({ error: "Server configuration missing" }, { status: 500 });

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
        const { data: userRes, error: authErr } = await client.auth.getUser(token);
        if (authErr || !userRes.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: z.infer<typeof EnhancerSchema>;
        try {
          body = EnhancerSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid prompt" }, { status: 400 });
        }

        try {
          const completion = await generateChatCompletion({
            model: "openai/gpt-6.1-terra",
            messages: [
              {
                role: "system",
                content:
                  "Improve the user's software-building prompt so it is clear, specific, and actionable. Respond ONLY with the improved prompt in the same language, with no preamble.",
              },
              { role: "user", content: body.message },
            ],
          });
          const improved = completion.choices?.[0]?.message?.content ?? body.message;
          return Response.json({ enhanced: improved.trim() });
        } catch (err) {
          const msg = err instanceof GatewayError ? err.message : "Enhancement failed";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});