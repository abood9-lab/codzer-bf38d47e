import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const projectInput = z.object({ projectId: z.string().min(1).max(150) });

export const sandboxAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(projectInput.extend({ action: z.enum(["connect", "status", "stop", "execute", "sync"]), command: z.string().max(10000).optional() }))
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase.from("projects").select("id,sandbox_id").eq("id", data.projectId).eq("owner_id", context.userId).maybeSingle();
    if (error || !project) throw new Error("Project not found or access denied");
    const runtime = await import("@/lib/daytona.server");
    let id = project.sandbox_id;
    if (data.action === "connect" && !id) {
      const created = await runtime.createSandbox(project.id, context.userId); id = created.id;
      const { error: saveError } = await context.supabase.from("projects").update({ sandbox_id: id, sandbox_status: created.state }).eq("id", project.id).eq("owner_id", context.userId);
      if (saveError) { await runtime.daytonaRequest(`/sandbox/${encodeURIComponent(id)}`, "DELETE"); throw new Error("Could not attach sandbox to project"); }
    }
    if (!id) return { state: "none", output: "Connect a sandbox first", exitCode: null };
    let sandbox = await runtime.getSandbox(id);
    if (data.action === "connect" && (sandbox.state === "stopped" || sandbox.state === "archived")) {
      await runtime.daytonaRequest(`/sandbox/${encodeURIComponent(id)}/start`, "POST"); sandbox = await runtime.getSandbox(id);
    }
    if (data.action === "stop") {
      await runtime.daytonaRequest(`/sandbox/${encodeURIComponent(id)}/stop`, "POST");
      await context.supabase.from("projects").update({ sandbox_status: "stopping" }).eq("id", project.id).eq("owner_id", context.userId);
      return { state: "stopping", output: "Sandbox is stopping", exitCode: null };
    }
    if (data.action === "sync" || data.action === "execute") {
      if (sandbox.state !== "started") throw new Error(`Daytona is ${sandbox.state}; wait until it is ready`);
      if (data.action === "sync") {
        const { data: files, error: filesError } = await context.supabase.from("project_files").select("relative_path,content").eq("project_id", project.id).eq("owner_id", context.userId);
        if (filesError) throw new Error("Could not read project files");
        const { normalizeFilePath } = await import("@/lib/workspace-tools");
        for (const file of files ?? []) await runtime.toolboxRequest(id, `/files/upload-v2?path=${encodeURIComponent(`/home/daytona/workspace/${normalizeFilePath(file.relative_path)}`)}`, file.content, "application/octet-stream");
        return { state: sandbox.state, output: `Synced ${files?.length ?? 0} saved files to /home/daytona/workspace`, exitCode: 0 };
      }
      if (!data.command?.trim()) throw new Error("Enter a command");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: secrets, error: secretError } = await supabaseAdmin.from("project_secrets").select("name,encrypted_value").eq("project_id", project.id).eq("owner_id", context.userId);
      if (secretError) throw new Error("Could not load project keys");
      const { decryptProjectSecret } = await import("@/lib/project-secrets.server");
      const envs: Record<string, string> = {};
      for (const item of secrets ?? []) envs[item.name] = await decryptProjectSecret(item.encrypted_value, `${context.userId}:${project.id}:${item.name}`);
      const result = z.object({ result: z.string(), exitCode: z.number().optional() }).parse(await runtime.toolboxRequest(id, "/process/execute", JSON.stringify({ command: data.command, cwd: "/home/daytona", envs, timeout: 30 }), "application/json"));
      let output = result.result;
      for (const value of Object.values(envs)) if (value) output = output.replaceAll(value, "[REDACTED]");
      return { state: sandbox.state, output: output.slice(0, 100000), exitCode: result.exitCode ?? 0 };
    }
    await context.supabase.from("projects").update({ sandbox_status: sandbox.state }).eq("id", project.id).eq("owner_id", context.userId);
    return { state: sandbox.state, output: "", exitCode: null };
  });

export const manageProjectSecrets = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(projectInput.extend({ action: z.enum(["list", "save", "delete"]), name: z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/).optional(), value: z.string().min(1).max(16000).optional() }))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase.from("projects").select("id").eq("id", data.projectId).eq("owner_id", context.userId).maybeSingle();
    if (!project) throw new Error("Project not found or access denied");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "save") {
      if (!data.name || !data.value) throw new Error("Key name and value are required");
      const { encryptProjectSecret } = await import("@/lib/project-secrets.server");
      const { error } = await supabaseAdmin.from("project_secrets").upsert({ project_id: project.id, owner_id: context.userId, name: data.name, encrypted_value: await encryptProjectSecret(data.value, `${context.userId}:${project.id}:${data.name}`), updated_at: new Date().toISOString() });
      if (error) throw new Error("Could not securely save key");
    } else if (data.action === "delete") {
      if (!data.name) throw new Error("Key name is required");
      const { error } = await supabaseAdmin.from("project_secrets").delete().eq("project_id", project.id).eq("owner_id", context.userId).eq("name", data.name);
      if (error) throw new Error("Could not remove key");
    }
    const { data: keys, error } = await supabaseAdmin.from("project_secrets").select("name,updated_at").eq("project_id", project.id).eq("owner_id", context.userId);
    if (error) throw new Error("Could not list project keys");
    return { keys: keys ?? [] };
  });