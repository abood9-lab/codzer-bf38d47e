import { useMemo, useState } from "react";
import { Code2, Eye, FileCode, Key, RefreshCw, Smartphone, Monitor, X, Plus, Trash2 } from "lucide-react";
import { buildPreviewHtml } from "@/lib/artifact-parser";
import type { WorkspaceFile } from "@/lib/types";

interface WorkbenchPanelProps {
  files: Record<string, WorkspaceFile>;
  onUpdateFile: (path: string, content: string) => void;
  onClose: () => void;
}

export function WorkbenchPanel({ files, onUpdateFile, onClose }: WorkbenchPanelProps) {
  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "secrets">("preview");
  const [selectedPath, setSelectedPath] = useState<string>(filePaths[0] ?? "");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [secrets, setSecrets] = useState<Array<{ key: string; value: string }>>([]);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const effectivePath = selectedPath && files[selectedPath] ? selectedPath : (filePaths[0] ?? "");
  const activeFile = effectivePath ? files[effectivePath] : undefined;
  const previewHtml = useMemo(() => buildPreviewHtml(files), [files]);

  const addSecret = (e: React.FormEvent) => {
    e.preventDefault();
    const k = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!k) return;
    setSecrets((prev) => [...prev.filter((s) => s.key !== k), { key: k, value: newVal }]);
    setNewKey("");
    setNewVal("");
  };

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "code"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" /> Code ({filePaths.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("secrets")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "secrets"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Key className="h-3.5 w-3.5" /> Secrets
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setViewport((v) => (v === "desktop" ? "mobile" : "desktop"))}
                title="Toggle device viewport"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {viewport === "desktop" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                title="Reload preview"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close workbench"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {activeTab === "preview" && (
        <div className="flex flex-1 items-center justify-center overflow-auto bg-secondary/40 p-2">
          <iframe
            key={refreshKey}
            title="Live Application Preview"
            sandbox="allow-scripts allow-forms allow-modals"
            srcDoc={previewHtml}
            className={`h-full rounded-lg border border-border bg-card shadow-sm transition-all ${
              viewport === "mobile" ? "w-[390px] max-w-full" : "w-full"
            }`}
          />
        </div>
      )}

      {activeTab === "code" && (
        <div className="flex min-h-0 flex-1">
          <div className="w-48 shrink-0 overflow-y-auto border-r border-border bg-secondary/30 p-2">
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Files
            </div>
            {filePaths.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">No generated files yet.</p>
            ) : (
              <ul className="space-y-0.5">
                {filePaths.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      onClick={() => setSelectedPath(path)}
                      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        effectivePath === path
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border px-3 py-1.5 text-xs font-mono text-muted-foreground">
              {effectivePath || "Select a file"}
            </div>
            <textarea
              value={activeFile?.content ?? ""}
              onChange={(e) => {
                if (effectivePath) onUpdateFile(effectivePath, e.target.value);
              }}
              spellCheck={false}
              placeholder="Generated code will appear here..."
              className="flex-1 resize-none bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
            />
          </div>
        </div>
      )}

      {activeTab === "secrets" && (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-foreground">Workspace Environment Secrets</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Draft environment variables for your generated project preview (kept local to this session).
          </p>
          <form onSubmit={addSecret} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="API_KEY_NAME"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="Secret value"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {secrets.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <span className="font-mono text-xs font-medium text-foreground">{s.key}</span>
                <button
                  type="button"
                  onClick={() => setSecrets((prev) => prev.filter((item) => item.key !== s.key))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}