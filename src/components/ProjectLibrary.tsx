import { useState } from "react";
import { FolderOpen, Loader2, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { WorkspaceFile } from "@/lib/types";
import { inferLanguage } from "@/lib/artifact-parser";
import { Button } from "@/components/ui/button";

export function ProjectLibrary({ onLoad }: { onLoad: (id: string, name: string, files: Record<string, WorkspaceFile>) => void }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const show = async () => {
    setOpen(true);
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in to open your projects");
      const { data, error } = await supabase.from("projects").select("*").eq("owner_id", auth.user.id).order("updated_at", { ascending: false });
      if (error) throw error;
      setProjects(data ?? []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load projects"); }
    finally { setBusy(false); }
  };

  const load = async (project: Tables<"projects">) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("project_files").select("relative_path,content").eq("project_id", project.id);
      if (error) throw error;
      const files = Object.fromEntries((data ?? []).map((file) => [file.relative_path, { path: file.relative_path, content: file.content, language: inferLanguage(file.relative_path) }]));
      onLoad(project.id, project.name, files);
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not open project"); }
    finally { setBusy(false); }
  };

  const remove = async (project: Tables<"projects">) => {
    if (!window.confirm(`Delete “${project.name}” and its files? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) toast.error(error.message);
    else setProjects((previous) => previous.filter((item) => item.id !== project.id));
    setBusy(false);
  };

  return <>
    <Button variant="ghost" size="icon" title="My projects" aria-label="My projects" onClick={() => void show()}><FolderOpen /></Button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="My projects" className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">My projects</h2><Button variant="ghost" size="icon" aria-label="Close projects" onClick={() => setOpen(false)}><X /></Button></div>
        <label className="mb-4 flex items-center gap-2 border-b border-border pb-2"><Search className="size-4 text-muted-foreground" /><input aria-label="Search projects" placeholder="Search projects" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        {busy ? <Loader2 className="mx-auto animate-spin text-primary" /> : projects.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No saved projects yet.</p> : projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase())).map((project) => <div key={project.id} className="flex items-center gap-2 border-b border-border py-3">
          <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal py-2 text-left" onClick={() => void load(project)}><FolderOpen /><span className="min-w-0"><span className="block truncate font-medium">{project.name}</span><span className="block text-xs font-normal text-muted-foreground">{project.total_files} files · {new Date(project.updated_at).toLocaleDateString()}</span></span></Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${project.name}`} onClick={() => void remove(project)}><Trash2 className="text-destructive" /></Button>
        </div>)}
      </section>
    </div>}
  </>;
}