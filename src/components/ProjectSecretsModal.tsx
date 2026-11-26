import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, KeyRound, Loader2, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { manageProjectSecrets } from "@/lib/workspace.functions";
import type { SecretRequest } from "@/lib/workspace-protocol";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ProjectSecretsModal({ projectId, requests, onClose, onSaved }: { projectId: string; requests: SecretRequest[]; onClose: () => void; onSaved: (names: string[]) => void }) {
  const manage = useServerFn(manageProjectSecrets);
  const [keys, setKeys] = useState<string[]>([]);
  const [name, setName] = useState(requests[0]?.name ?? "");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!projectId) return; void manage({ data: { projectId, action: "list" } }).then((result) => setKeys(result.keys.map((key) => key.name))).catch(() => toast.error("Could not load project keys")); }, [projectId, manage]);
  const update = async (action: "save" | "delete", keyName = name) => {
    setBusy(true);
    try { const result = await manage({ data: { projectId, action, name: keyName, ...(action === "save" ? { value } : {}) } }); const names = result.keys.map((key) => key.name); setKeys(names); setValue(""); onSaved(names); toast.success(action === "save" ? "Key saved securely" : "Key removed"); }
    catch { toast.error("Could not update project key"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto p-0">
    <div className="border-b border-border bg-secondary/50 p-6"><LockKeyhole className="mb-4 size-7 text-primary" /><DialogTitle className="text-2xl">Project secrets</DialogTitle><DialogDescription className="mt-3">Encrypted, project-only keys. Values never enter chat or preview files. Available to commands in your Daytona sandbox.</DialogDescription></div>
    <div className="space-y-5 px-6 pb-6">
      {!projectId ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Save this project first, then add its private keys.</p> : <>
        {requests.length > 0 && <div className="space-y-2">{requests.map((request) => <Button key={request.name} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3 text-start" onClick={() => { setName(request.name); setValue(""); }}><KeyRound className="shrink-0 text-primary" /><span><span className="block font-mono text-xs">{request.name}</span><span className="block text-xs font-normal text-muted-foreground" dir="auto">{request.reason}</span></span>{keys.includes(request.name) && <Check className="ml-auto shrink-0" />}</Button>)}</div>}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void update("save"); }}>
          <label className="block space-y-2 text-xs font-medium">Key name<input aria-label="Key name" value={name} maxLength={128} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="SERVICE_API_KEY" className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block space-y-2 text-xs font-medium">Secret value<input type="password" autoComplete="new-password" aria-label="Secret value" value={value} maxLength={16000} onChange={(e) => setValue(e.target.value)} placeholder="Enter your private key" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring" /></label>
          <Button type="submit" disabled={busy || !value.trim() || !/^[A-Z][A-Z0-9_]{0,127}$/.test(name)} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <Plus />}Save encrypted key</Button>
        </form>
        {keys.length > 0 && <div className="border-t border-border pt-4"><h3 className="mb-2 text-xs font-semibold text-muted-foreground">CONFIGURED KEYS</h3>{keys.map((key) => <div key={key} className="flex items-center justify-between py-1"><span className="flex min-w-0 items-center gap-2 font-mono text-xs"><LockKeyhole className="size-3.5 shrink-0 text-primary" /><span className="truncate">{key}</span></span><Button variant="ghost" size="icon" disabled={busy} title={`Remove ${key}`} aria-label={`Remove ${key}`} onClick={() => { if (window.confirm(`Remove ${key}?`)) void update("delete", key); }}><Trash2 /></Button></div>)}</div>}
      </>}
    </div>
  </DialogContent></Dialog>;
}