import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowUp, Check, CircleCheckBig, Clock, Lock, Pizza, Unlink, UtensilsCrossed, X, CircleDashed, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LangSwitch, Logo, Message, Spinner, type ResponseType } from "@/components/app/common";
import { parseHours, useI18n, type TKey } from "@/lib/i18n";
import { DurationPicker } from "@/components/app/DurationPicker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/r/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Svar på overtid – Overtid & Mat" },
      { name: "description", content: "Svar om du kan jobbe overtid, og velg mat." },
      { property: "og:title", content: "Kan du jobbe overtid?" },
      { property: "og:description", content: "Trykk for å svare og velge mat." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeePage,
});

type Request = {
  session: { id: string; date: string; title: string; estimated_hours: number; includes_food: boolean; is_open: boolean };
  company_name: string;
  min_hours_for_food?: number;
  menu: { id: string; name: string; category: string }[];
};
type Answer = {
  id: string;
  user_name: string;
  response_type: ResponseType;
  hours: number | null;
  food_id: string | null;
  food_name: string | null;
  food_comment: string | null;
};

const nameSchema = z.string().trim().min(1, "errName").max(60, "errNameLong");
const commentSchema = z.string().trim().max(200);

const serverErrors: Record<string, TKey> = {
  "Invalid link": "errLink",
  "Request is closed": "errClosed",
  "Invalid name": "errName",
  "Invalid response": "errResponse",
  "Invalid hours": "errHours",
  "Choose a dish": "errDish",
};

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

const NAME_KEY = "otm-name";

function EmployeePage() {
  const { token } = Route.useParams();
  const { t, num, date } = useI18n();
  const qc = useQueryClient();

  const req = useQuery({
    queryKey: ["public-request", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_request", { p_token: token });
      if (error) throw error;
      return (data as unknown as Request | null) ?? null;
    },
  });

  const [name, setName] = useState("");
  useEffect(() => {
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, []);
  const debName = useDebounced(name.trim(), 500);

  const my = useQuery({
    queryKey: ["my-answer", token, debName.toLowerCase()],
    enabled: !!req.data && debName.length > 0 && debName.length <= 60,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_my_answer", { p_token: token, p_name: debName });
      if (error) throw error;
      return (data as unknown as Answer | null) ?? null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [partialOpen, setPartialOpen] = useState(false);
  const [fullChosen, setFullChosen] = useState(false);
  const [hoursText, setHoursText] = useState("");
  const [err, setErr] = useState<{ key: TKey; where: "name" | "food" | "hours" | "answer" } | null>(null);
  const foodRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset edit mode when a different person types their name.
  useEffect(() => {
    setEditing(false);
  }, [debName]);

  const foodOk = (v: { hours: number | null }) =>
    !!req.data?.session.includes_food && (v.hours ?? 0) > Number(req.data?.min_hours_for_food ?? 0);

  const submit = useMutation({
    mutationFn: async (vars: { type: ResponseType; hours: number | null }) => {
      const { data, error } = await supabase.rpc("public_submit_answer", {
        p_token: token,
        p_name: name.trim(),
        p_response_type: vars.type,
        p_hours: vars.hours ?? 0,
        p_food_id: vars.type === "declined" || !foodOk(vars) ? "" : (foodId ?? ""),
        p_food_comment: vars.type === "declined" || !foodOk(vars) ? "" : comment.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      window.localStorage.setItem(NAME_KEY, name.trim());
      if ("vibrate" in navigator) navigator.vibrate?.(80);
      setEditing(false);
      setPartialOpen(false);
      setFullChosen(false);
      return qc.invalidateQueries({ queryKey: ["my-answer", token] });
    },
    onError: (e: { message?: string }) => {
      const key = Object.entries(serverErrors).find(([m]) => e.message?.includes(m))?.[1] ?? "errGeneric";
      setErr({ key, where: key === "errDish" ? "food" : key === "errName" ? "name" : key === "errHours" ? "hours" : "answer" });
    },
  });

  if (req.isLoading)
    return (
      <Shell>
        <div className="flex items-center gap-3 text-xl" role="status">
          <Spinner /> {t("loading")}
        </div>
      </Shell>
    );

  if (req.isError || !req.data)
    return (
      <Shell>
        <BigState icon={<Unlink className="size-20" aria-hidden />} title={t("badLink")} text={t("badLinkHelp")} />
      </Shell>
    );

  const { session, company_name, menu } = req.data;
  const est = Number(session.estimated_hours);
  const threshold = Number(req.data.min_hours_for_food ?? 0);
  const plannedHours = partialOpen ? parseHours(hoursText) : fullChosen ? est : NaN;
  const foodUnlocked = session.includes_food && !Number.isNaN(plannedHours) && plannedHours > threshold;
  const saved = my.data && debName === name.trim() ? my.data : null;
  const showConfirmation = saved && !editing && !submit.isPending;

  function validate(type: ResponseType): boolean {
    setErr(null);
    const n = nameSchema.safeParse(name);
    if (!n.success) {
      setErr({ key: (n.error.issues[0]?.message as TKey) ?? "errName", where: "name" });
      nameRef.current?.focus();
      return false;
    }
    if (!commentSchema.safeParse(comment).success) return false;
    if (type !== "declined" && foodUnlocked && !foodId) {
      setErr({ key: "errDish", where: "food" });
      foodRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    return true;
  }

  function answer(type: ResponseType) {
    if (submit.isPending) return;
    if (type === "partial") {
      if (!validate("partial")) return;
      const h = parseHours(hoursText);
      if (Number.isNaN(h) || h <= 0 || h > est) {
        setErr({ key: "errHours", where: "hours" });
        return;
      }
      submit.mutate({ type, hours: h });
      return;
    }
    if (!validate(type)) return;
    submit.mutate({ type, hours: type === "full" ? est : 0 });
  }

  function chooseFull() {
    setPartialOpen(false);
    setErr(null);
    if (session.includes_food && est > threshold) {
      if (!nameSchema.safeParse(name).success) {
        validate("full");
        return;
      }
      setFullChosen(true);
      setTimeout(() => foodRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    setFullChosen(false);
    answer("full");
  }

  const submitChosen = () => answer(partialOpen ? "partial" : "full");

  const answerLabel = (a: Answer) =>
    a.response_type === "full"
      ? t("pillFull")
      : a.response_type === "partial"
        ? t("pillPartial", { n: num(Number(a.hours ?? 0)) })
        : t("pillDeclined");

  return (
    <Shell company={company_name}>
      {/* Request card */}
      <section className="rounded-2xl border-2 border-primary bg-card p-5 shadow-sm">
        <p className="text-lg font-semibold capitalize text-muted-foreground">{date(session.date)}</p>
        <h1 className="mt-1 text-3xl font-bold">{session.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-xl font-bold">
          <span className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
            <Clock className="size-7" aria-hidden /> {t("hoursN", { n: num(est) })}
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
            {session.includes_food ? <Pizza className="size-7" aria-hidden /> : <UtensilsCrossed className="size-7" aria-hidden />}
            {session.includes_food ? t("withFood") : t("noFood")}
          </span>
        </div>
      </section>

      {!session.is_open ? (
        <BigState icon={<Lock className="size-20" aria-hidden />} title={t("closed")} text={t("closedHelp")} />
      ) : showConfirmation && saved ? (
        <section
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center"
          role="status"
          aria-live="polite"
        >
          <CircleCheckBig className="size-32 text-success" aria-hidden />
          <p className="text-3xl font-bold">{t("saved")}</p>
          <p className="max-w-md text-2xl">
            {t("youSaid", { a: answerLabel(saved) })}
            {saved.food_name ? ` ${t("foodIs", { f: saved.food_name })}` : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setFoodId(saved.food_id);
              setComment(saved.food_comment ?? "");
            }}
            className="flex min-h-16 w-full max-w-sm items-center justify-center gap-2 rounded-xl border-2 border-primary bg-card text-xl font-bold"
          >
            <RotateIcon /> {t("changeAnswer")}
          </button>
        </section>
      ) : (
        <>
          {/* 1 Name */}
          <StepCard n={1} icon={<User className="size-7" aria-hidden />} title={t("name")}>
            <label htmlFor="name" className="sr-only">
              {t("name")}
            </label>
            <input
              ref={nameRef}
              id="name"
              value={name}
              maxLength={60}
              autoComplete="name"
              placeholder={t("namePh")}
              onChange={(e) => setName(e.target.value)}
              className="h-16 w-full rounded-xl border-2 border-input bg-card px-4 text-xl"
            />
            {err?.where === "name" ? <Message kind="error" className="mt-3">{t(err.key)}</Message> : null}
            {saved && editing ? (
              <Message kind="info" className="mt-3">
                {t("savedBefore")}: {answerLabel(saved)}
                {saved.food_name ? ` · ${saved.food_name}` : ""}
              </Message>
            ) : null}
          </StepCard>

          {/* 2 Answer */}
          <StepCard n={2} icon={<CircleCheckBig className="size-7" aria-hidden />} title={t("answer")}>
            <div className="space-y-3">
              <AnswerButton
                variant="full"
                disabled={submit.isPending}
                busy={submit.isPending && submit.variables?.type === "full"}
                onClick={chooseFull}
                icon={<Check className="size-8" aria-hidden />}
                label={t("full")}
              />
              <AnswerButton
                variant="partial"
                disabled={submit.isPending}
                busy={false}
                onClick={() => {
                  setPartialOpen((o) => !o);
                  setFullChosen(false);
                  setErr(null);
                }}
                icon={<CircleDashed className="size-8" aria-hidden />}
                label={t("partial")}
                expanded={partialOpen}
              />
              <div
                className={cn(
                  "grid transition-all duration-300",
                  partialOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="rounded-xl border-2 border-partial bg-partial/5 p-4">
                    <label htmlFor="hours" className="block text-xl font-bold">
                      {t("howMany")}
                    </label>
                    <p className="text-lg text-muted-foreground">{t("maxHours", { n: num(est) })}</p>
                    <div className="mt-3">
                      <DurationPicker
                        id="hours"
                        max={est}
                        value={parseHours(hoursText) || 0}
                        onChange={(h) => setHoursText(String(h))}
                        tabIndex={partialOpen ? 0 : -1}
                      />
                    </div>
                    {!foodUnlocked ? <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        tabIndex={partialOpen ? 0 : -1}
                        disabled={submit.isPending}
                        onClick={() => answer("partial")}
                        className="flex h-16 flex-1 items-center justify-center gap-2 rounded-xl bg-partial text-2xl font-bold text-partial-foreground disabled:opacity-60"
                      >
                        {submit.isPending && submit.variables?.type === "partial" ? <Spinner /> : <Check aria-hidden />}
                        {t("ok")}
                      </button>
                    </div> : null}
                    {err?.where === "hours" ? (
                      <Message kind="error" className="mt-3">{t("errHours", { n: num(est) })}</Message>
                    ) : null}
                  </div>
                </div>
              </div>
              <AnswerButton
                variant="declined"
                disabled={submit.isPending}
                busy={submit.isPending && submit.variables?.type === "declined"}
                onClick={() => { setFullChosen(false); setPartialOpen(false); answer("declined"); }}
                icon={<X className="size-8" aria-hidden />}
                label={t("declined")}
              />
              {err?.where === "answer" ? <Message kind="error">{t(err.key)}</Message> : null}
              {err?.where === "food" ? <Message kind="error">{t("errDish")}</Message> : null}
            </div>
          </StepCard>

          {/* 3 Food */}
          {session.includes_food && (partialOpen || fullChosen) && !foodUnlocked ? (
            <section className="flex items-center gap-3 rounded-2xl border-2 bg-muted p-5 text-lg" role="status">
              <Lock className="size-8 shrink-0" aria-hidden />
              <p>Mat kan bestilles hvis du jobber mer enn {num(threshold)} timer.</p>
            </section>
          ) : null}
          {foodUnlocked ? (
            <StepCard n={3} icon={<Pizza className="size-7" aria-hidden />} title={t("foodHead")} sectionRef={foodRef}>
              {err?.where === "food" ? (
                <Message kind="error" className="mb-3">
                  <span className="flex items-center gap-2">
                    <ArrowUp aria-hidden className="size-6" /> {t(err.key)}
                  </span>
                </Message>
              ) : null}
              <div role="radiogroup" aria-label={t("food")} className="grid gap-3 sm:grid-cols-2">
                {menu.map((m) => {
                  const sel = foodId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => {
                        setFoodId(m.id);
                        if (err?.where === "food") setErr(null);
                      }}
                      className={cn(
                        "flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-xl font-bold transition-colors",
                        sel ? "border-success bg-success/10" : "border-border bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                          sel ? "border-success bg-success text-success-foreground" : "border-input",
                        )}
                        aria-hidden
                      >
                        {sel ? <Check className="size-5" /> : null}
                      </span>
                      <span>
                        {m.name}
                        <span className="block text-base font-normal text-muted-foreground">{m.category}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <label htmlFor="comment" className="mt-4 block text-lg font-bold">
                {t("comment")}
              </label>
              <input
                id="comment"
                value={comment}
                maxLength={200}
                autoComplete="off"
                placeholder={t("commentPh")}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2 h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg"
              />
              <button
                type="button"
                disabled={submit.isPending}
                onClick={submitChosen}
                className="mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-success text-2xl font-bold text-success-foreground disabled:opacity-60"
              >
                {submit.isPending ? <Spinner /> : <Check aria-hidden />} {t("ok")}
              </button>
            </StepCard>
          ) : null}

        </>
      )}
    </Shell>
  );
}

function RotateIcon() {
  return <span aria-hidden className="text-2xl">↻</span>;
}

function Shell({ children, company }: { children: React.ReactNode; company?: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b-2 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
          <div>
            <Logo className="text-xl" />
            {company ? <p className="pl-12 text-base font-semibold text-muted-foreground">{company}</p> : null}
          </div>
          <LangSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-xl px-4">
        <Link to="/privacy" className="text-base underline">
          {t("privacy")}
        </Link>
      </footer>
    </div>
  );
}

function BigState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border-2 bg-card p-8 text-center" role="status">
      {icon}
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="text-xl">{text}</p>
    </section>
  );
}

function StepCard({
  n,
  icon,
  title,
  children,
  sectionRef,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section ref={sectionRef} className="scroll-mt-28 rounded-2xl border-2 bg-card p-5">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground" aria-hidden>
          {n}
        </span>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function AnswerButton({
  variant,
  icon,
  label,
  onClick,
  disabled,
  busy,
  expanded,
}: {
  variant: ResponseType;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={cn(
        "flex min-h-16 w-full items-center gap-4 rounded-xl px-5 py-3 text-left text-xl font-bold disabled:opacity-60",
        variant === "full" && "bg-success text-success-foreground",
        variant === "partial" && "border-[3px] border-partial bg-card text-partial",
        variant === "declined" && "bg-destructive text-destructive-foreground",
      )}
    >
      {busy ? <Spinner className="size-8" /> : icon}
      {label}
    </button>
  );
}
