import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Menu,
  Plus,
  Send,
  Sparkles,
  Trash2,
  PanelRightOpen,
  Sun,
  Moon,
  Shield,
  User as UserIcon,
  Loader2,
  FileCode2,
  Hammer,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { parseArtifactsFromText } from "@/lib/artifact-parser";
import type { ChatMessage, ChatSession, ExecutionMode, ProviderId, WorkspaceFile } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ModelSelector } from "@/components/ModelSelector";
import { ProfileModal } from "@/components/ProfileModal";
import { WorkbenchPanel } from "@/components/WorkbenchPanel";

interface ChatWorkspaceProps {
  chatId?: string;
  initialPrompt?: string;
  initialProvider?: ProviderId;
  initialModel?: string;
  initialMode?: ExecutionMode;
}

export function ChatWorkspace({
  chatId,
  initialPrompt,
  initialProvider = "lovable",
  initialModel = "openai/gpt-6.1-terra",
  initialMode = "build",
}: ChatWorkspaceProps) {
  const navigate = useNavigate();
  const { session, user, profile, isAdmin, loading: authLoading, refreshProfile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(chatId && chatId !== "new" ? chatId : "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<Record<string, WorkspaceFile>>({});
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<ProviderId>(initialProvider);
  const [model, setModel] = useState<string>(initialModel);
  const [mode, setMode] = useState<ExecutionMode>(initialMode);
  const [streaming, setStreaming] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("bolt_theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("bolt_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chats")
      .select("id, url_id, description, provider, model, messages, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setHistory(
        data.map((row) => ({
          ...row,
          provider: (row.provider as ProviderId) || "lovable",
          messages: Array.isArray(row.messages) ? (row.messages as unknown as ChatMessage[]) : [],
        })),
      );
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!user || !chatId || chatId === "new") {
      setMessages([]);
      setFiles({});
      setActiveChatId("");
      return;
    }
    setActiveChatId(chatId);
    supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const loadedMsgs = Array.isArray(data.messages) ? (data.messages as unknown as ChatMessage[]) : [];
        setMessages(loadedMsgs);
        setProvider((data.provider as ProviderId) || "lovable");
        setModel(data.model || "openai/gpt-6.1-terra");

        const extracted: Record<string, WorkspaceFile> = {};
        for (const m of loadedMsgs) {
          if (m.role === "assistant") {
            const { artifacts } = parseArtifactsFromText(m.content);
            for (const a of artifacts) {
              for (const f of a.files) extracted[f.path] = f;
            }
          }
        }
        setFiles(extracted);
        if (Object.keys(extracted).length > 0) setWorkbenchOpen(true);
      });
  }, [chatId, user]);

  const persistChat = useCallback(
    async (id: string, nextMessages: ChatMessage[]) => {
      if (!user) return;
      const description = (nextMessages[0]?.content ?? "New Chat").slice(0, 80);
      await supabase.from("chats").upsert({
        id,
        user_id: user.id,
        url_id: id,
        description,
        provider,
        model,
        messages: nextMessages as unknown as never,
        updated_at: new Date().toISOString(),
      });
      void loadHistory();
    },
    [user, provider, model, loadHistory],
  );

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || streaming || !session?.access_token) return;

      const currentId = activeChatId || `chat_${Date.now().toString(36)}`;
      if (!activeChatId) setActiveChatId(currentId);

      const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", content: text };
      const assistantId = `a_${Date.now() + 1}`;
      const nextHistory = [...messages, userMsg];

      setMessages([...nextHistory, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
            provider,
            model,
            mode,
          }),
        });

        if (!res.ok || !res.body) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
          );
        }

        const finalMessages: ChatMessage[] = [
          ...nextHistory,
          { id: assistantId, role: "assistant", content: accumulated },
        ];
        setMessages(finalMessages);

        const { artifacts } = parseArtifactsFromText(accumulated);
        if (artifacts.length > 0) {
          setFiles((prev) => {
            const updated = { ...prev };
            for (const a of artifacts) {
              for (const f of a.files) updated[f.path] = f;
            }
            return updated;
          });
          setWorkbenchOpen(true);
        }

        await persistChat(currentId, finalMessages);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send message";
        toast.error(msg);
        setMessages(nextHistory);
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, session, activeChatId, messages, provider, model, mode, persistChat],
  );

  useEffect(() => {
    if (initialPrompt && session?.access_token && !autoSentRef.current) {
      autoSentRef.current = true;
      void sendMessage(initialPrompt);
    }
  }, [initialPrompt, session, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEnhance = async () => {
    if (!input.trim() || enhancing || !session?.access_token) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/enhancer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = (await res.json()) as { enhanced?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Enhance failed");
      if (data.enhanced) setInput(data.enhanced);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enhance prompt");
    } finally {
      setEnhancing(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    setHistory((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId("");
      setMessages([]);
      setFiles({});
      void navigate({ to: "/chat" });
    }
    toast.success("Chat deleted");
  };

  const fileCount = useMemo(() => Object.keys(files).length, [files]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:static lg:inset-auto">
          <aside className="flex h-full w-72 flex-col border-r border-border bg-sidebar">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <BrandLogo showSub />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  setActiveChatId("");
                  setMessages([]);
                  setFiles({});
                  setWorkbenchOpen(false);
                  void navigate({ to: "/chat" });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Start New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Chats
              </div>
              {history.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground">No saved conversations yet.</p>
              ) : (
                <ul className="space-y-1">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                        activeChatId === item.id
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-secondary/70"
                      }`}
                    >
                      <Link
                        to="/chat/$id"
                        params={{ id: item.id }}
                        className="min-w-0 flex-1 truncate"
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.description || "Untitled chat"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteChat(item.id)}
                        aria-label="Delete chat"
                        className="ml-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1 border-t border-border p-3">
              {isAdmin && (
                <Link
                  to="/admin/storage"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Shield className="h-3.5 w-3.5 text-primary" /> Admin Storage
                </Link>
              )}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary"
              >
                <UserIcon className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{profile?.display_name || user?.email || "Account"}</span>
              </button>
            </div>
          </aside>
          <div
            className="flex-1 bg-foreground/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/" className="hidden sm:inline-flex">
              <BrandLogo />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setWorkbenchOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <PanelRightOpen className="h-3.5 w-3.5 text-primary" />
              Workbench {fileCount > 0 ? `(${fileCount})` : ""}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-2xl space-y-4">
                {messages.length === 0 ? (
                  <div className="py-16 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                      What do you want to build?
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Describe an app, component, or workflow — Whiterchat generates code and live previews instantly.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const parsed =
                      msg.role === "assistant"
                        ? parseArtifactsFromText(msg.content)
                        : { cleanMarkdown: msg.content, artifacts: [] };
                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                            : "border border-border bg-card text-card-foreground"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="space-y-3">
                            {parsed.cleanMarkdown ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {parsed.cleanMarkdown}
                                </ReactMarkdown>
                              </div>
                            ) : streaming ? (
                              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
                              </span>
                            ) : null}

                            {parsed.artifacts.map((art) => (
                              <button
                                key={art.id}
                                type="button"
                                onClick={() => setWorkbenchOpen(true)}
                                className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/60 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary"
                              >
                                <div className="flex items-center gap-2.5">
                                  <FileCode2 className="h-4 w-4 text-primary" />
                                  <div>
                                    <div className="text-xs font-semibold text-foreground">{art.title}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {art.files.length} file{art.files.length === 1 ? "" : "s"} — Click to open Workbench
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-border bg-background px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
                className="prompt-shell mx-auto max-w-2xl rounded-2xl p-2"
              >
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={mode === "plan" ? "Message Whiterchat · Plan mode" : "Message Whiterchat"}
                  className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMode((m) => (m === "build" ? "plan" : "build"))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/70 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      {mode === "build" ? (
                        <>
                          <Hammer className="h-3 w-3 text-primary" /> Build
                        </>
                      ) : (
                        <>
                          <ListChecks className="h-3 w-3 text-primary" /> Plan
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={enhancing || !input.trim()}
                      onClick={handleEnhance}
                      title="Enhance prompt"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                    >
                      {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Enhance
                    </button>
                  </div>

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
                      disabled={streaming || !input.trim()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                    >
                      {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </main>

          {workbenchOpen && (
            <div className="hidden w-[48%] max-w-3xl lg:block">
              <WorkbenchPanel
                files={files}
                onUpdateFile={(path, content) =>
                  setFiles((prev) => ({
                    ...prev,
                    [path]: { ...(prev[path] ?? { path, language: "text" }), content },
                  }))
                }
                onClose={() => setWorkbenchOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      <ProfileModal
        isOpen={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onSaved={() => void refreshProfile()}
        onSignOut={async () => {
          await signOut();
          setProfileOpen(false);
          void navigate({ to: "/" });
        }}
      />
    </div>
  );
}