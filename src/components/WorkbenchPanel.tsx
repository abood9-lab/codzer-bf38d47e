import { useMemo, useRef, useState } from "react";
import { Code2, Eye, RefreshCw, Smartphone, Monitor, X, Plus, Trash2, Download, Upload, Save, Loader2, Undo2, Redo2, FileCode } from "lucide-react";
import { toast } from "sonner";
import { buildPreviewHtml } from "@/lib/artifact-parser";
import { createProjectZip, downloadFile, makeWorkspaceFile } from "@/lib/workspace-tools";
import { starterTemplates } from "@/lib/starter-templates";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProjectLibrary } from "@/components/ProjectLibrary";
import type { WorkspaceFile } from "@/lib/types";

interface WorkbenchPanelProps {
  files: Record<string, WorkspaceFile>;
  onReplaceFiles: (files: Record<string, WorkspaceFile>) => void;
  onUpdateFile: (path: string, content: string) => void;
  onClose: () => void;
}

export function WorkbenchPanel({ files, onUpdateFile, onReplaceFiles, onClose }: WorkbenchPanelProps) {
  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [selectedPath, setSelectedPath] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("Untitled project");
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [undo, setUndo] = useState<Record<string, WorkspaceFile>[]>([]);
  const [redo, setRedo] = useState<Record<string, WorkspaceFile>[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const effectivePath = selectedPath && files[selectedPath] ? selectedPath : filePaths[0] ?? "";
  const activeFile = files[effectivePath];
  const previewHtml = useMemo(() => buildPreviewHtml(files), [files]);
  const snapshot = JSON.stringify({ name, files });
  const dirty = snapshot !== savedSnapshot;

  const changeFiles = (next: Record<string, WorkspaceFile>) => {
    setUndo((previous) => [...previous.slice(-49), files]);
    setRedo([]);
    onReplaceFiles(next);
  };

  const save = async () => {
    if (!filePaths.length || saving || !name.trim()) return;
    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to save a project");
      const id = projectId || crypto.randomUUID();
      const totalBytes = Object.values(files).reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0);
      const { error: projectError } = await supabase.from("projects").upsert({ id, owner_id: auth.user.id, name: name.trim(), total_files: filePaths.length, total_bytes: totalBytes, storage_backend: "database", updated_at: new Date().toISOString() });
      if (projectError) throw projectError;
      setProjectId(id);
      const { data: previous, error: readError } = await supabase.from("project_files").select("id,relative_path").eq("project_id", id);
      if (readError) throw readError;
      const { error: fileError } = await supabase.from("project_files").upsert(Object.values(files).map((file) => ({ id: `${id}:${file.path}`, owner_id: auth.user.id, project_id: id, relative_path: file.path, content: file.content, mime_type: "text/plain", size_bytes: new TextEncoder().encode(file.content).byteLength, storage_location: "database", updated_at: new Date().toISOString() })));
      if (fileError) throw fileError;
      const obsolete = (previous ?? []).filter((file) => !files[file.relative_path]).map((file) => file.id);
      if (obsolete.length) {
        const { error } = await supabase.from("project_files").delete().in("id", obsolete);
        if (error) throw error;
      }
      setSavedSnapshot(snapshot);
      toast.success("Project saved to cloud");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed; please try again"); }
    finally { setSaving(false); }
  };

  const exportZip = () => {
    try {
      const zip = createProjectZip(files);
      downloadFile(`${name.replace(/[^\p{L}\p{N}_-]/gu, "-") || "project"}.zip`, new Uint8Array(zip).buffer, "application/zip");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Export failed"); }
  };

  return <aside className="flex h-full min-w-0 flex-col border-l border-border bg-card">
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-2">
      <input aria-label="Project name" className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold outline-none" value={name} onChange={(event) => setName(event.target.value)} />
      <ProjectLibrary onLoad={(id, projectName, next) => {
        if (filePaths.length && dirty && !window.confirm("Replace unsaved workspace files?")) return;
        setProjectId(id); setName(projectName); onReplaceFiles(next); setSavedSnapshot(JSON.stringify({ name: projectName, files: next })); setUndo([]); setRedo([]);
      }} />
      <Button variant="ghost" size="icon" title="Import text files" aria-label="Import text files" disabled={saving} onClick={() => uploadRef.current?.click()}><Upload /></Button>
      <Button variant="ghost" size="icon" title="Download ZIP" aria-label="Download ZIP" disabled={!filePaths.length} onClick={exportZip}><Download /></Button>
      <Button size="sm" title="Save project" disabled={saving || !filePaths.length || !name.trim()} onClick={() => void save()}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save</Button>
      <Button variant="ghost" size="icon" title="Close workbench" aria-label="Close workbench" onClick={onClose}><X /></Button>
      <input type="file" accept=".html,.css,.js,.ts,.tsx,.jsx,.json,.md,.txt,.sql,.py" multiple ref={uploadRef} className="hidden" onChange={async (event) => {
        const chosen = Array.from(event.target.files ?? []); event.target.value = "";
        try {
          const next = { ...files };
          for (const file of chosen) {
            if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name} is too large (maximum 2 MB)`);
            if (next[file.name] && !window.confirm(`Replace ${file.name}?`)) continue;
            const imported = makeWorkspaceFile(file.name, await file.text()); next[imported.path] = imported;
          }
          changeFiles(next); setActiveTab("code");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed"); }
      }} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2">
      <div className="flex gap-1"><Button variant={activeTab === "preview" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("preview")}><Eye />Preview</Button><Button variant={activeTab === "code" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("code")}><Code2 />Code ({filePaths.length})</Button></div>
      <span className="text-xs text-muted-foreground">{savedSnapshot && !dirty ? "Saved to cloud" : "Unsaved changes"}</span>
    </div>
    {!filePaths.length ? <div className="flex-1 overflow-y-auto p-6">
      <h2 className="mb-6 text-xl font-semibold">Start with a project</h2>
      {starterTemplates.map((template) => <Button key={template.id} variant="outline" className="mb-3 h-auto w-full justify-start py-4 text-left" onClick={() => { setProjectId(""); setName(template.name); changeFiles(structuredClone(template.files)); }}><FileCode /><span><span className="block font-semibold">{template.name}</span><span className="block text-xs font-normal text-muted-foreground">{template.subtitle}</span></span></Button>)}
    </div> : activeTab === "preview" ? <>
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-xs text-muted-foreground">{viewport === "mobile" ? "390 px" : viewport === "tablet" ? "768 px" : "Desktop"}</span>
        <div className="flex gap-1">{(["desktop", "tablet", "mobile"] as const).map((device) => <Button key={device} variant={viewport === device ? "secondary" : "ghost"} size="icon" title={`${device} preview`} aria-label={`${device} preview`} onClick={() => setViewport(device)}>{device === "mobile" ? <Smartphone /> : <Monitor />}</Button>)}<Button variant="ghost" size="icon" title="Reload preview" aria-label="Reload preview" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw /></Button></div>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-secondary/40 p-2"><iframe key={refreshKey} title="Live Application Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewHtml} className={`h-full shrink-0 border border-border bg-card ${viewport === "mobile" ? "w-[390px] max-w-full" : viewport === "tablet" ? "w-[768px] max-w-full" : "w-full"}`} /></div>
    </> : <div className="flex min-h-0 flex-1">
      <div className="w-32 shrink-0 overflow-y-auto border-r border-border bg-secondary/30 p-2 sm:w-44">
        <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Files</span><Button variant="ghost" size="icon" title="New file" aria-label="New file" onClick={() => {
          const path = window.prompt("File path", "new-file.js"); if (!path) return;
          try { const file = makeWorkspaceFile(path, ""); if (files[file.path]) throw new Error("File already exists"); changeFiles({ ...files, [file.path]: file }); setSelectedPath(file.path); } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid path"); }
        }}><Plus /></Button></div>
        {filePaths.map((path) => <Button key={path} variant={effectivePath === path ? "secondary" : "ghost"} size="sm" className="mb-1 w-full justify-start" title={path} onClick={() => setSelectedPath(path)}><FileCode /><span className="truncate">{path}</span></Button>)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-2 py-1"><span className="truncate font-mono text-xs text-muted-foreground">{effectivePath}</span><div className="flex">
          <Button variant="ghost" size="icon" title="Undo edit" aria-label="Undo edit" disabled={!undo.length} onClick={() => { const previous = undo.at(-1); if (!previous) return; setRedo((stack) => [...stack, files]); setUndo((stack) => stack.slice(0, -1)); onReplaceFiles(previous); }}><Undo2 /></Button>
          <Button variant="ghost" size="icon" title="Redo edit" aria-label="Redo edit" disabled={!redo.length} onClick={() => { const next = redo.at(-1); if (!next) return; setUndo((stack) => [...stack, files]); setRedo((stack) => stack.slice(0, -1)); onReplaceFiles(next); }}><Redo2 /></Button>
          <Button variant="ghost" size="icon" title="Delete file" aria-label="Delete file" disabled={!effectivePath} onClick={() => { if (!window.confirm(`Delete ${effectivePath}?`)) return; const next = { ...files }; delete next[effectivePath]; changeFiles(next); }}><Trash2 /></Button>
        </div></div>
        <textarea aria-label="File contents" value={activeFile?.content ?? ""} onChange={(event) => { setUndo((previous) => [...previous.slice(-49), files]); setRedo([]); if (effectivePath) onUpdateFile(effectivePath, event.target.value); }} spellCheck={false} className="min-h-0 flex-1 resize-none bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none" />
      </div>
    </div>}
  </aside>;
}
