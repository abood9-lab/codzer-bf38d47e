import { Zap } from "lucide-react";

export function BrandLogo({ showSub = false }: { showSub?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Zap className="h-4 w-4 fill-current" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-foreground">Whiterchat</span>
        {showSub && (
          <span className="text-[10px] font-medium text-muted-foreground">AI Coding Studio</span>
        )}
      </span>
    </span>
  );
}