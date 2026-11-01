import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Message({
  kind,
  children,
  className,
}: {
  kind: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-lg font-semibold",
        kind === "error" && "border-destructive bg-destructive/10 text-destructive",
        kind === "success" && "border-success bg-success/10 text-success",
        kind === "info" && "border-border bg-muted text-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin motion-reduce:animate-none", className)} aria-hidden />;
}

export function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang")} className="flex gap-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          aria-label={l.label}
          className={cn(
            "flex h-12 min-w-12 items-center justify-center gap-1 rounded-lg border-2 px-2 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
            lang === l.code ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
          )}
        >
          <span aria-hidden className="text-xl">{l.flag}</span>
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription className="text-lg">{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="h-14 text-lg">{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="h-14 bg-destructive text-lg text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-2xl font-bold", className)}>
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-accent text-xl">
        🍕
      </span>
      Overtid &amp; Mat
    </span>
  );
}

export type ResponseType = "full" | "partial" | "declined";

export function AnswerPill({ type, hours }: { type: ResponseType; hours: number | null }) {
  const { t, num } = useI18n();
  const map = {
    full: { cls: "bg-success text-success-foreground", icon: "✓", text: t("pillFull") },
    partial: { cls: "bg-partial text-partial-foreground", icon: "◐", text: t("pillPartial", { n: num(hours ?? 0) }) },
    declined: { cls: "bg-destructive text-destructive-foreground", icon: "✕", text: t("pillDeclined") },
  }[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold", map.cls)}>
      <span aria-hidden>{map.icon}</span>
      {map.text}
    </span>
  );
}
