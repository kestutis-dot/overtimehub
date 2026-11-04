import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, Copy, Lock, LockOpen, MessageSquare, Pencil, Plus, Printer, QrCode, RefreshCw, Share2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerPill, Confirm, Message, Spinner, type ResponseType } from "@/components/app/common";
import { parseHours, useI18n } from "@/lib/i18n";
import { DurationPicker } from "./DurationPicker";
import { ShareBar } from "./ShareBar";
import { entriesQuery, sessionQuery, shareUrl, totals, type Entry, type Session } from "@/lib/manager-data";

const btn = "flex h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 text-lg font-bold";

export function AnswersTab({ companyId }: { companyId: string }) {
  const { t, num, date } = useI18n();
  const qc = useQueryClient();
  const s = useQuery(sessionQuery(companyId));
  const e = useQuery(entriesQuery(s.data?.id));
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [confirm, setConfirm] = useState<"close" | "link" | Entry | null>(null);
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);
  const inv = () => qc.invalidateQueries();

  const patch = useMutation({
    mutationFn: async (p: Partial<Session>) => {
      const { error } = await supabase.from("overtime_sessions").update(p).eq("id", s.data?.id ?? "");
      if (error) throw error;
    },
    onError: () => setErr(true), onSettled: inv,
  });
  const rotate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("rotate_share_token", { p_session_id: s.data?.id ?? "" });
      if (error) throw error;
    },
    onError: () => setErr(true), onSettled: inv,
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("overtime_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onError: () => setErr(true), onSettled: inv,
  });

  if (s.isLoading) return <Skeleton className="h-64" />;
  const session = s.data;
  const entries = e.data ?? [];
  const tot = totals(entries);
  const url = session ? shareUrl(session.share_token) : "";
  const msg = `${t("inviteText")} ${url}`;

  return (
    <>
      {err ? <Message kind="error">{t("saveError")}</Message> : null}
      <section className="rounded-2xl border-2 border-primary bg-card p-5">
        {!session ? (
          <Message kind="info">{t("noRequest")} {t("noRequestHelp")}</Message>
        ) : (
          <>
            <p className="text-lg capitalize text-muted-foreground">{date(session.date)}</p>
            <h2 className="text-3xl font-bold">{session.title}</h2>
            <p className="mt-2 text-lg font-semibold">
              ⏱ {t("hoursN", { n: num(Number(session.estimated_hours)) })} · {session.includes_food ? `🍕 ${t("withFood")}` : t("noFood")} ·{" "}
              {session.is_open ? `🔓 ${t("open")}` : `🔒 ${t("closed")}`}
            </p>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {session ? (
            <>
              <button className={btn} onClick={() => setForm("edit")}><Pencil aria-hidden /> {t("edit")}</button>
              {session.is_open ? (
                <button className={btn} onClick={() => setConfirm("close")}><Lock aria-hidden /> {t("close")}</button>
              ) : (
                <button className={btn} onClick={() => patch.mutate({ is_open: true })}><LockOpen aria-hidden /> {t("reopen")}</button>
              )}
            </>
          ) : null}
          <button className={`${btn} col-span-2 border-primary bg-primary text-primary-foreground`} onClick={() => setForm("new")}>
            <Plus aria-hidden /> {t("newRequest")}
          </button>
        </div>
      </section>

      {session ? (
        <section className="rounded-2xl border-2 bg-card p-5 no-print">
          <h2 className="mb-2 text-2xl font-bold">{t("linkCard")}</h2>
          <p className="break-all rounded-xl bg-muted p-3 text-lg">{url}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button className={btn} onClick={() => void navigator.clipboard.writeText(url).then(() => setCopied(true))}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? t("copied") : t("copy")}
            </button>
            <button className={btn} onClick={() => {
              if (navigator.share) void navigator.share({ text: msg, url }).catch(() => undefined);
              else void navigator.clipboard.writeText(url).then(() => setCopied(true));
            }}><Share2 aria-hidden /> {t("share")}</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button className={`${btn} whitespace-nowrap`} onClick={() => setQr(true)}><QrCode aria-hidden className="shrink-0" /> {t("showQr")}</button>
            <button className={`${btn} whitespace-nowrap`} disabled={rotate.isPending} onClick={() => setConfirm("link")}>
              {rotate.isPending ? <Spinner /> : <RefreshCw aria-hidden className="shrink-0" />} {t("newLink")}
            </button>
          </div>
        </section>
      ) : null}

      {session ? (
        <section className="rounded-2xl border-2 bg-card p-5">
          <h2 className="mb-3 text-2xl font-bold">{t("totals")}</h2>
          <div className="grid grid-cols-2 gap-3 text-lg font-bold sm:grid-cols-4">
            <div className="rounded-xl bg-success p-3 text-success-foreground">✓ {t("pillFull")}: {tot.full}</div>
            <div className="rounded-xl bg-partial p-3 text-partial-foreground">◐ {t("partial").split(" ").slice(-3).join(" ")}: {tot.partial}</div>
            <div className="rounded-xl bg-destructive p-3 text-destructive-foreground">✕ {t("pillDeclined")}: {tot.declined}</div>
            <div className="rounded-xl bg-muted p-3">⏱ {t("totalHours")}: {num(tot.hours)}</div>
          </div>
          <h2 className="mb-3 mt-6 text-2xl font-bold">{t("answers")}</h2>
          {e.isLoading ? <Skeleton className="h-32" /> : entries.length === 0 ? (
            <Message kind="info">{t("noAnswers")} {t("noAnswersHelp")}</Message>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {entries.map((x) => {
                const tooMany = Number(x.hours ?? 0) > Number(session.estimated_hours);
                const noDish = session.includes_food && x.response_type !== "declined" && !x.food_name;
                return (
                  <li key={x.id} className="rounded-xl border-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xl font-bold">{x.user_name}</p>
                        <AnswerPill type={x.response_type as ResponseType} hours={Number(x.hours ?? 0)} />
                        {x.food_name ? <p className="mt-2 text-lg">🍕 {x.food_name}</p> : null}
                        {x.food_comment ? <p className="text-muted-foreground">“{x.food_comment}”</p> : null}
                        {tooMany ? <p className="mt-2 flex items-center gap-1 font-bold text-warning"><AlertTriangle aria-hidden className="size-5" /> {t("warnHours")}</p> : null}
                        {noDish ? <p className="mt-2 flex items-center gap-1 font-bold text-warning"><AlertTriangle aria-hidden className="size-5" /> {t("warnDish")}</p> : null}
                      </div>
                      <button aria-label={t("delete")} onClick={() => setConfirm(x)} className="flex size-14 items-center justify-center rounded-xl border-2 border-destructive text-destructive">
                        <Trash2 aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {entries.length > 0 ? (
            <ShareBar
              title={`${session.title} – ${session.date}`}
              text={[
                `✓ ${t("pillFull")}: ${tot.full} · ◐ ${tot.partial} · ✕ ${t("pillDeclined")}: ${tot.declined} · ⏱ ${num(tot.hours)}`,
                "",
                ...entries.map((x) => {
                  const h = x.response_type === "declined" ? `✕ ${t("pillDeclined")}` : `${x.response_type === "full" ? "✓" : "◐"} ${t("hoursN", { n: num(Number(x.hours ?? 0)) })}`;
                  return `• ${x.user_name} — ${h}${x.food_name ? ` · 🍕 ${x.food_name}` : ""}${x.food_comment ? ` (${x.food_comment})` : ""}`;
                }),
              ].join("\n")}
            />
          ) : null}
        </section>
      ) : null}

      <Confirm open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "close" ? t("closeQ") : confirm === "link" ? t("newLinkQ") : t("deleteQ")}
        description={confirm === "close" ? t("closeHelp") : confirm === "link" ? t("newLinkHelp") : typeof confirm === "object" && confirm ? confirm.user_name : ""}
        confirmLabel={t("yes")}
        onConfirm={() => {
          if (confirm === "close") patch.mutate({ is_open: false });
          else if (confirm === "link") rotate.mutate();
          else if (confirm) del.mutate(confirm.id);
        }} />

      <Dialog open={qr} onOpenChange={setQr}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-2xl">{session?.title}</DialogTitle></DialogHeader>
          <div className="flex justify-center bg-card p-4"><QRCodeSVG value={url} size={300} /></div>
          <button className={`${btn} no-print`} onClick={() => window.print()}><Printer aria-hidden /> {t("print")}</button>
        </DialogContent>
      </Dialog>

      {form ? <SessionForm companyId={companyId} session={form === "edit" ? session ?? null : null} onDone={() => setForm(null)} /> : null}
    </>
  );
}

function SessionForm({ companyId, session, onDone }: { companyId: string; session: Session | null; onDone: () => void }) {
  const { t, num } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState(session?.title ?? "Overtid");
  const [day, setDay] = useState(session?.date ?? new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(num(Number(session?.estimated_hours ?? 2)));
  const [food, setFood] = useState(session?.includes_food ?? true);
  const [err, setErr] = useState(false);
  const save = useMutation({
    mutationFn: async () => {
      const h = parseHours(hours);
      if (!title.trim() || title.length > 80 || Number.isNaN(h) || h <= 0 || h > 24) throw new Error("invalid");
      const row = { title: title.trim(), date: day, estimated_hours: h, includes_food: food };
      const { error } = session
        ? await supabase.from("overtime_sessions").update(row).eq("id", session.id)
        : await supabase.from("overtime_sessions").insert({ ...row, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { void qc.invalidateQueries(); onDone(); },
    onError: () => setErr(true),
  });
  const input = "mt-1 h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg";
  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-2xl">{session ? t("edit") : t("newRequest")}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(false); save.mutate(); }}>
          <label className="block text-lg font-bold">{t("title")}<input className={input} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="block text-lg font-bold">{t("date")}<input type="date" className={input} value={day} onChange={(e) => setDay(e.target.value)} /></label>
          <div><p className="text-lg font-bold">{t("estHours")}</p><DurationPicker max={24} value={parseHours(hours) || 0} onChange={(h) => setHours(String(h))} /></div>
          <label className="flex h-14 items-center gap-3 text-lg font-bold">
            <input type="checkbox" className="size-7" checked={food} onChange={(e) => setFood(e.target.checked)} /> 🍕 {t("includesFood")}
          </label>
          {err ? <Message kind="error">{t("saveError")}</Message> : null}
          <button disabled={save.isPending} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            {save.isPending ? <Spinner /> : <Check aria-hidden />} {t("save")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
