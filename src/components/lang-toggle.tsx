"use client";

import { useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "onDark";
}) {
  const { locale, setLocale } = useT();
  const opts: Locale[] = ["es", "en"];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-0.5 text-xs font-semibold",
        variant === "onDark" ? "bg-white/15" : "bg-muted",
        className,
      )}
    >
      {opts.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 uppercase transition-colors",
              active
                ? variant === "onDark"
                  ? "bg-white text-primary"
                  : "bg-background text-foreground shadow-sm"
                : variant === "onDark"
                  ? "text-white/80"
                  : "text-muted-foreground",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
