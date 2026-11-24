import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Cpu, Search, Sparkles } from "lucide-react";
import type { ModelCategory, ModelsApiResponse, ProviderId } from "@/lib/types";

interface ModelSelectorProps {
  provider: ProviderId;
  model: string;
  onSelect: (provider: ProviderId, model: string) => void;
}

const CATEGORIES: Array<{ id: "all" | ModelCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "coding", label: "Coding" },
  { id: "reasoning", label: "Reasoning" },
  { id: "fast", label: "Fast" },
];

export function ModelSelector({ provider, model, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<ModelsApiResponse | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ModelCategory>("all");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ModelsApiResponse | null) => {
        if (data) setCatalog(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const activeProvider = catalog?.providers.find((p) => p.id === provider);
  const activeModel = activeProvider?.models.find((m) => m.id === model);
  const label = activeModel?.name ?? model.split("/").pop() ?? "GPT-6.1 Terra";

  const allModels = (catalog?.providers ?? []).flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.name, configured: p.configured })),
  );

  const filtered = allModels.filter((m) => {
    const matchCat = category === "all" || m.categories.includes(category);
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.providerName.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Cpu className="h-3.5 w-3.5 text-primary" />
        <span className="max-w-[130px] truncate">{label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-80 max-w-[90vw] rounded-xl border border-border bg-popover p-2.5 shadow-xl">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models or providers..."
              className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mb-2 flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  category === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filtered.map((item) => {
              const isSelected = item.provider === provider && item.id === model;
              return (
                <button
                  key={`${item.provider}-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelect(item.provider, item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start justify-between gap-2 rounded-lg p-2 text-left transition-colors ${
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-secondary/70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">{item.name}</span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {item.providerName}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{item.pricing}</span>
                      {!item.configured && (
                        <span className="inline-flex items-center gap-0.5 text-primary">
                          <Sparkles className="h-2.5 w-2.5" /> Uses Built-in AI until key added
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}