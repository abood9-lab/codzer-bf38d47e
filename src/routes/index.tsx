import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Hammer, ListChecks, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ExecutionMode, ProviderId } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ModelSelector } from "@/components/ModelSelector";
import { AuthModal } from "@/components/AuthModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Whiterchat — Where Ideas Begin" },
      {
        name: "description",
        content: "Bring ideas to life in seconds with multi-provider AI models, live workbench previews, and Lovable Cloud persistence.",
      },
      { property: "og:title", content: "Whiterchat — Where Ideas Begin" },
      {
        property: "og:description",
        content: "Bring ideas to life in seconds with multi-provider AI models, live workbench previews, and Lovable Cloud persistence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<ProviderId>("lovable");
  const [model, setModel] = useState("openai/gpt-6.1-terra");
  const [mode, setMode] = useState<ExecutionMode>("build");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const raw = sessionStorage.getItem("pending_prompt");
      if (raw) {
        sessionStorage.removeItem("pending_prompt");
        try {
          const parsed = JSON.parse(raw) as {
            prompt: string;
            provider?: ProviderId;
            model?: string;
            mode?: ExecutionMode;
          };
          void navigate({
            to: "/chat",
            search: {
              prompt: parsed.prompt,
              provider: parsed.provider ?? "lovable",
              model: parsed.model ?? "openai/gpt-6.1-terra",
              mode: parsed.mode ?? "build",
            },
            replace: true,
          });
          return;
        } catch {
          // ignore invalid pending prompt
        }
      }
    }
  }, [loading, user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    if (!user) {
      sessionStorage.setItem(
        "pending_prompt",
        JSON.stringify({ prompt: text, provider, model, mode }),
      );
      setAuthModalOpen(true);
      return;
    }

    void navigate({
      to: "/chat",
      search: { prompt: text, provider, model, mode },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link to="/">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#providers" className="transition-colors hover:text-foreground">AI Models</a>
            <a href="#showcase" className="transition-colors hover:text-foreground">Cloud Sync</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/chat"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Where ideas begin
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Bring ideas to life in seconds or get help on existing projects.
          </p>

          <form onSubmit={handleSubmit} className="prompt-shell mt-8 rounded-2xl p-2.5 text-left">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={mode === "plan" ? "Message Whiterchat · Plan mode" : "Message Whiterchat"}
              className="w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2">
              <button
                type="button"
                onClick={() => setMode((m) => (m === "build" ? "plan" : "build"))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                {mode === "build" ? (
                  <>
                    <Hammer className="h-3.5 w-3.5 text-primary" /> Build
                  </>
                ) : (
                  <>
                    <ListChecks className="h-3.5 w-3.5 text-primary" /> Plan
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <ModelSelector
                  provider={provider}
                  model={model}
                  onSelect={(p, m) => {
                    setProvider(p);
                    setModel(m);
                  }}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section id="features" className="border-t border-border bg-secondary/40 px-6 py-24">
        <div className="mx-auto max-w-6xl space-y-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                01. Advanced AI Synthesis
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Full-Stack Architecture Generated in Seconds
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Leverage top-tier reasoning models to architect complete web applications, interactive components, and live previews with zero boilerplate delay.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg lg:col-span-6">
              <img
                src="/images/feature_ai_coding_1795334331777.jpg"
                alt="AI Coding Dashboard"
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>

          <div id="providers" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-4 lg:order-2 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                02. Multi-Provider Flexibility
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Switch Between Built-in AI, OpenRouter, Groq &amp; Gemini
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Never get locked into a single provider. Use built-in AI immediately or connect OpenRouter, Groq, and Google Gemini with category filtering and transparent pricing.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg lg:order-1 lg:col-span-6">
              <img
                src="/images/feature_multi_provider_1795334330835.jpg"
                alt="Model Selector Interface"
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>

          <div id="showcase" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                03. Cloud &amp; Database Persistence
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Lovable Cloud Persistence &amp; Daytona Volumes
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your conversations, profiles, and project metadata are securely persisted in Lovable Cloud with row-level security, alongside Daytona Volume &amp; Cloudinary integration support.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg lg:col-span-6">
              <img
                src="/images/feature_cloud_sync_1795334331319.jpg"
                alt="Cloud Persistence Sync"
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo showSub />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Whiterchat. Powered by Lovable Cloud, OpenRouter, Groq &amp; Gemini.
          </p>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          void navigate({ to: "/chat", search: { prompt: prompt.trim(), provider, model, mode } });
        }}
      />
    </div>
  );
}
