import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ListChecks, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { planningQuestionsSchema, type PlanningQuestion } from "@/lib/workspace-protocol";
import type { ProviderId } from "@/lib/types";

export function PlanningModal({ prompt, token, provider, model, onClose, onComplete }: { prompt: string; token: string; provider: ProviderId; model: string; onClose: () => void; onComplete: (text: string) => void }) {
  const [questions, setQuestions] = useState<PlanningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setQuestions([]); setStep(0); setAnswers({});
    void (async () => {
      try {
        const response = await fetch("/api/chat", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], provider, model, mode: "plan", phase: "questions" }) });
        if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error ?? "Could not prepare questions"); }
        const raw = (await response.text()).replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
        const parsed = planningQuestionsSchema.parse(JSON.parse(raw));
        if (!controller.signal.aborted) setQuestions(parsed.questions);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not prepare questions"); }
    })();
    return () => controller.abort();
  }, [prompt, token, provider, model, attempt]);
  const question = questions[step];
  const answer = question ? answers[question.id] ?? "" : "";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="discovery-modal max-h-[90dvh] max-w-xl overflow-y-auto p-0">
    <div className="border-b border-border bg-secondary/50 p-6">
      <span className="mb-4 flex items-center gap-2 text-xs font-semibold text-primary"><ListChecks className="size-4" />PLAN / DISCOVERY</span>
      <DialogTitle className="text-2xl">Let’s shape your idea</DialogTitle>
      <DialogDescription className="mt-2 line-clamp-2">{prompt}</DialogDescription>
    </div>
    <div className="px-6 pb-6">
      {error ? <div className="space-y-4 py-5"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt((n) => n + 1)}><RotateCcw />Try again</Button></div> : !question ? <div className="flex flex-col items-center gap-4 py-12"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Preparing your project questions…</p></div> : <>
        <div className="mb-6 flex items-center justify-between"><span className="text-xs text-muted-foreground">Question {step + 1} of {questions.length}</span><div className="flex gap-1.5">{questions.map((q, i) => <span key={q.id} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}</div></div>
        <h3 className="mb-5 text-lg font-semibold leading-relaxed" dir="auto">{question.question}</h3>
        <div className="mb-4 grid gap-2">{question.options.map((option) => <Button key={option} variant={answer === option ? "secondary" : "outline"} className="h-auto min-h-12 justify-between whitespace-normal py-3 text-start" onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}><span dir="auto">{option}</span>{answer === option && <Check className="shrink-0 text-primary" />}</Button>)}</div>
        <textarea aria-label="Your answer" dir="auto" maxLength={4000} value={answer} onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))} placeholder="Your answer…" className="min-h-24 w-full resize-y rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-6 flex justify-between gap-3"><Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft />Back</Button><Button disabled={!answer.trim()} onClick={() => {
          if (step < questions.length - 1) setStep((s) => s + 1);
          else onComplete(`${prompt}\n\nDiscovery answers:\n${questions.map((q) => `${q.question}\n${answers[q.id] ?? ""}`).join("\n\n")}\n\nCreate the final professional implementation plan based on these answers.`);
        }}>{step === questions.length - 1 ? <><Sparkles />Create plan</> : <>Continue<ArrowRight /></>}</Button></div>
      </>}
    </div>
  </DialogContent></Dialog>;
}