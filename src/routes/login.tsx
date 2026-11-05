import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Mail, Send, RotateCcw, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LangSwitch, Logo, Message, Spinner } from "@/components/app/common";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Logg inn – Overtid & Mat" },
      { name: "description", content: "Logg inn med e-post for å styre overtid og mat." },
      { property: "og:title", content: "Logg inn – Overtid & Mat" },
      { property: "og:description", content: "Logg inn med e-post for å styre overtid og mat." },
    ],
  }),
  component: Login,
});

const emailSchema = z.string().trim().email().max(255);

function mapErr(e: { status?: number | undefined; message?: string | undefined }): TKey {
  const m = (e.message ?? "").toLowerCase();
  if (e.status === 429 || m.includes("rate") || m.includes("too many") || m.includes("seconds")) return "errWait";
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) return "errCode";
  return "errGeneric";
}

function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<TKey | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setErr("errEmail");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setErr(mapErr(error));
    setEmail(parsed.data);
    setStep("code");
    setLeft(60);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <header className="mb-10 flex items-center justify-between gap-2">
        <Logo />
        <LangSwitch />
      </header>
      {step === "email" ? (
        <section className="mb-8">
          <h1 className="text-3xl font-bold leading-tight">{t("introTitle")}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("introText")}</p>
        </section>
      ) : null}
      {FORM_SLOT}
      {step === "email" ? (
        <section className="mt-10">
          <ul className="space-y-3">
            {([
              ["⚡", "introF1t", "introF1"],
              ["🍕", "introF2t", "introF2"],
              ["📋", "introF3t", "introF3"],
            ] as const).map(([icon, title, text]) => (
              <li key={title} className="flex gap-3 rounded-xl bg-card p-3">
                <span className="text-2xl" aria-hidden>{icon}</span>
                <div>
                  <p className="font-bold">{t(title)}</p>
                  <p className="text-base text-muted-foreground">{t(text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === "email" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <h2 className="text-2xl font-bold">{t("getStarted")}</h2>
          <p className="text-base text-muted-foreground">{t("getStartedHelp")}</p>
          <label htmlFor="email" className="block text-lg font-bold">
            {t("email")}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-16 w-full rounded-xl border-2 border-input bg-card pl-14 pr-4 text-xl"
            />
          </div>
          {err ? <Message kind="error">{t(err)}</Message> : null}
          <button
            disabled={busy}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xl font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Spinner /> : <Send aria-hidden />} {t("sendCode")}
          </button>
          <p className="text-center text-base text-muted-foreground">
            ☕ Liker du appen?{" "}
            <a href="https://buymeacoffee.com/baltas" target="_blank" rel="noopener noreferrer" className="underline">
              Spander en kaffe
            </a>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mail className="size-14 text-primary" aria-hidden />
            <h2 className="text-2xl font-bold">{t("enterCode")}</h2>
            <p className="text-lg text-muted-foreground">{t("codeSent", { e: email })}</p>
          </div>
          {err ? <Message kind="error">{t(err)}</Message> : null}
          <button
            type="button"
            disabled={left > 0 || busy}
            onClick={() => void send()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary text-lg font-bold disabled:opacity-50"
          >
            <RotateCcw aria-hidden /> {left > 0 ? t("resendIn", { s: left }) : t("resend")}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setErr(null);
            }}
            className="flex h-14 items-center gap-2 text-lg font-bold underline"
          >
            <ArrowLeft aria-hidden /> {t("otherEmail")}
          </button>
        </div>
      )}
      <Link to="/privacy" className="mt-auto pt-10 text-lg underline">
        {t("privacy")}
      </Link>
    </main>
  );
}
