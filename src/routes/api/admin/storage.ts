import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/admin/storage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) {
          return Response.json({ error: "Server configuration missing" }, { status: 500 });
        }

        const userClient = createClient<Database>(url, key, {
          auth: { persistSession: false },
          global: {
            headers: { Authorization: `Bearer ${token}` },
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: userRes, error: authErr } = await userClient.auth.getUser(token);
        if (authErr || !userRes.user) {
          return Response.json({ error: "Invalid session" }, { status: 401 });
        }

        const { data: isAdmin } = await userClient.rpc("has_role", {
          _user_id: userRes.user.id,
          _role: "admin",
        });

        if (!isAdmin) {
          return Response.json({ error: "Administrator access required" }, { status: 403 });
        }

        const [projectsRes, sessionsRes] = await Promise.all([
          userClient
            .from("projects")
            .select("id, owner_id, name, volume_name, volume_subpath, sandbox_id, sandbox_status, total_files, total_bytes, updated_at")
            .order("updated_at", { ascending: false })
            .limit(50),
          userClient
            .from("workspace_sessions")
            .select("id, project_id, owner_id, sandbox_id, status, last_heartbeat_at")
            .eq("status", "active")
            .order("last_heartbeat_at", { ascending: false })
            .limit(50),
        ]);

        const daytonaConfigured = Boolean(process.env["DAYTONA_API_KEY"]?.trim());
        const cloudinaryUrl = process.env["CLOUDINARY_URL"]?.trim();
        const cloudinaryCloudName = process.env["CLOUDINARY_CLOUD_NAME"]?.trim() || null;

        return Response.json(
          {
            ok: true,
            daytona: {
              configured: daytonaConfigured,
              volumeName: "whiterchat-volume",
              status: daytonaConfigured ? "connected" : "credentials_pending",
            },
            cloudinary: {
              configured: Boolean(cloudinaryUrl || cloudinaryCloudName),
              cloudName: cloudinaryCloudName,
            },
            projects: projectsRes.data ?? [],
            activeSessions: sessionsRes.data ?? [],
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});