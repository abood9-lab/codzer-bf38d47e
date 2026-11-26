import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Cloud, Loader2, PlugZap, Power, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sandboxAction } from "@/lib/workspace.functions";

export function DaytonaTerminal({ projectId, dirty }: { projectId: string; dirty: boolean }) {
  const actionFn = useServerFn(sandboxAction);
  const [state, setState] = useState("none");
  const [busy, setBusy] = useState(false);
  const [command, setCommand] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setState("none"); setLines([]); setHistory([]); if (projectId) void actionFn({ data: { projectId, action: "status" } }).then((r) => setState(r.state)).catch(() => setLines(["Could not check Daytona status."])); }, [projectId, actionFn]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [lines]);
  useEffect(() => {
    if (!projectId || !["creating", "starting", "stopping", "pending", "building", "restoring"].includes(state)) return;
    const interval = setInterval(() => { void actionFn({ data: { projectId, action: "status" } }).then((r) => setState(r.state)).catch(() => { setState("error"); }); }, 3000);
    return () => clearInterval(interval);
  }, [state, projectId, actionFn]);
  const run = async (action: "connect" | "execute" | "sync" | "stop" | "status") => {
    if (!projectId || busy) return;
    const text = command.trim(); if (action === "execute" && !text) return;
    setBusy(true);
    if (action === "execute") { setLines((l) => [...l, `$ ${text}`]); setHistory((h) => [...h, text]); setCursor(history.length + 1); setCommand(""); }
    try { const result = await actionFn({ data: { projectId, action, ...(action === "execute" ? { command: text } : {}) } }); setState(result.state); if (result.output) setLines((l) => [...l, result.output, ...(result.exitCode !== null && result.exitCode !== 0 ? [`Exit code: ${result.exitCode}`] : [])]); }
    catch (error) { setLines((l) => [...l, error instanceof Error ? error.message : "Daytona operation failed"]); }
    finally { setBusy(false); }
  };
  return <section className="flex min-h-0 flex-1 flex-col bg-terminal text-terminal-foreground">
    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-terminal-border px-3 py-2"><span className="flex items-center gap-2 text-xs"><Cloud className="size-4 text-terminal-accent" />Daytona<span className="text-terminal-muted">/ {state}</span></span><div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" disabled={!projectId || busy || state === "started"} onClick={() => void run("connect")}><PlugZap />Connect</Button>
      <Button variant="ghost" size="icon" title="Sync saved project files" aria-label="Sync saved project files" disabled={busy || state !== "started" || dirty} onClick={() => void run("sync")}><Upload /></Button>
      <Button variant="ghost" size="icon" title="Refresh Daytona status" aria-label="Refresh Daytona status" disabled={busy || !projectId} onClick={() => void run("status")}><RefreshCw /></Button>
      <Button variant="ghost" size="icon" title="Stop sandbox" aria-label="Stop sandbox" disabled={busy || state !== "started"} onClick={() => void run("stop")}><Power /></Button>
      <Button variant="ghost" size="icon" title="Clear terminal" aria-label="Clear terminal" onClick={() => setLines([])}><Trash2 /></Button>
    </div></div>
    <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-6" role="log" aria-label="Terminal output">
      {!projectId && <p className="text-terminal-muted">Save your project to connect its Daytona sandbox.</p>}
      {projectId && !lines.length && <p className="text-terminal-muted">{state === "started" ? "Connected · /home/daytona · sync files to workspace/" : "Daytona cloud terminal"}</p>}
      {lines.map((line, i) => <pre key={i} className="whitespace-pre-wrap break-all">{line}</pre>)}
      {busy && <span className="inline-flex items-center gap-2 text-terminal-accent"><Loader2 className="size-3 animate-spin" />Running…</span>}<div ref={endRef} />
    </div>
    <form className="flex items-center gap-2 border-t border-terminal-border p-3" onSubmit={(e) => { e.preventDefault(); void run("execute"); }}><span className="font-mono text-terminal-accent">$</span><input aria-label="Terminal command" autoComplete="off" spellCheck={false} disabled={state !== "started" || busy} value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const next = Math.max(0, Math.min(history.length, cursor + (e.key === "ArrowUp" ? -1 : 1))); setCursor(next); setCommand(history[next] ?? ""); } }} placeholder="Enter a command…" className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-terminal-muted disabled:opacity-50" /><Button type="submit" variant="ghost" size="icon" title="Run command" aria-label="Run command" disabled={busy || state !== "started" || !command.trim()}><ArrowRight /></Button></form>
  </section>;
}