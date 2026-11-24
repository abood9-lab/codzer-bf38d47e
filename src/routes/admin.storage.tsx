import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Database, HardDrive, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/admin/storage")({
  head: () => ({
    meta: [
      { title: "Admin Storage — Whiterchat" },
      { name: "description", content: "Manage Daytona volumes, active workspace sessions, and Cloudinary status." },
      { property: "og:title", content: "Admin Storage — Whiterchat" },
      { property: "og:description", content: "Manage Daytona volumes, active workspace sessions, and Cloudinary status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminStoragePage,
});

interface StorageOverview {
  daytona: { configured: boolean; volumeName: string; status: string };
  cloudinary: { configured: boolean; cloudName: string | null };
  projects: Array<{
    id: string;
    name: string;
    volume_name: string;
    sandbox_status: string;
    total_files: number;
    updated_at: string;
  }>;
  activeSessions: Array<{
    id: string;
    project_id: string;
    status: string;
    last_heartbeat_at: string;
  }>;
}

function AdminStoragePage() {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<StorageOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    if (!session?.access_token) {
      setError("Authentication required to view storage administration.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/storage", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await res.json()) as StorageOverview & { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load storage overview");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) void fetchOverview();
  }, [authLoading, fetchOverview]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/chat" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Workspace
            </Link>
            <BrandLogo />
          </div>
          <button
            type="button"
            onClick={() => void fetchOverview()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Storage &amp; Volume Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor Daytona Volume status, Cloudinary integration, and active workspace sessions.
        </p>

        {loading ? (
          <div className="flex py-16 justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HardDrive className="h-4 w-4 text-primary" /> Daytona Volume
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Volume: <span className="font-mono text-foreground">{data.daytona.volumeName}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status:{" "}
                <span className="font-medium text-foreground">
                  {data.daytona.configured ? "Connected" : "API key pending configuration"}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Database className="h-4 w-4 text-primary" /> Cloudinary Media
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Status:{" "}
                <span className="font-medium text-foreground">
                  {data.cloudinary.configured ? `Connected (${data.cloudinary.cloudName ?? "configured"})` : "Credentials pending"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tracked projects: {data.projects.length} · Active sessions: {data.activeSessions.length}
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}