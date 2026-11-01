import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Building2, ClipboardList, ListChecks, Pizza, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LangSwitch, Logo, Message, Spinner } from "@/components/app/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, type TKey } from "@/lib/i18n";
import { membershipQuery, useLive } from "@/lib/manager-data";
import { AnswersTab } from "@/components/app/AnswersTab";
import { OrdersTab } from "@/components/app/OrdersTab";
import { MenuTab } from "@/components/app/MenuTab";
import { SettingsTab } from "@/components/app/SettingsTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Overtid & Mat – Leder" },
      { name: "description", content: "Se svar på overtid, samle matbestilling og styr menyen." },
      { property: "og:title", content: "Overtid & Mat" },
      { property: "og:description", content: "Overtid og matbestilling for små lagerteam." },
    ],
  }),
  component: ManagerApp,
});

type Tab = "answers" | "orders" | "menu" | "settings";
const TABS: { id: Tab; label: TKey; icon: typeof ListChecks }[] = [
  { id: "answers", label: "tabAnswers", icon: ListChecks },
  { id: "orders", label: "tabOrders", icon: ClipboardList },
  { id: "menu", label: "tabMenu", icon: Pizza },
  { id: "settings", label: "tabSettings", icon: Settings },
];

function ManagerApp() {
  const m = useQuery(membershipQuery());
  if (m.isLoading)
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  if (m.isError) return <div className="p-4"><ErrorMsg /></div>;
  if (!m.data) return <CreateCompany />;
  return <Shell companyId={m.data.company_id} companyName={m.data.companies?.name ?? ""} />;
}

function ErrorMsg() {
  const { t } = useI18n();
  return <Message kind="error">{t("errGeneric")}</Message>;
}

function Shell({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("answers");
  const live = useLive(companyId);
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b-2 bg-background/95 backdrop-blur no-print">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div>
            <Logo className="text-xl" />
            <p className="flex items-center gap-2 pl-12 text-base font-semibold text-muted-foreground">
              {companyName}
              <span className="flex items-center gap-1" role="status">
                <span className={cn("size-3 rounded-full", live ? "bg-success" : "bg-destructive")} aria-hidden />
                {live ? t("live") : t("offline")}
              </span>
            </p>
          </div>
          <LangSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {tab === "answers" && <AnswersTab companyId={companyId} />}
        {tab === "orders" && <OrdersTab companyId={companyId} />}
        {tab === "menu" && <MenuTab companyId={companyId} />}
        {tab === "settings" && <SettingsTab companyId={companyId} companyName={companyName} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 bg-card no-print" aria-label="Meny">
        <div className="mx-auto grid max-w-4xl grid-cols-4">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              aria-current={tab === x.id ? "page" : undefined}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 text-sm font-bold",
                tab === x.id ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <x.icon className="size-7" aria-hidden />
              {t(x.label)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function CreateCompany() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [err, setErr] = useState(false);
  const create = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.rpc("create_company", { p_name: n });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membership"] }),
    onError: () => setErr(true),
  });
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <LangSwitch />
      </header>
      <h1 className="flex items-center gap-2 text-3xl font-bold">
        <Building2 className="size-8" aria-hidden /> {t("createCompany")}
      </h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const p = z.string().trim().min(1).max(100).safeParse(name);
          if (!p.success) return setErr(true);
          setErr(false);
          create.mutate(p.data);
        }}
      >
        <label htmlFor="cname" className="block text-lg font-bold">{t("companyName")}</label>
        <input
          id="cname"
          value={name}
          maxLength={100}
          autoComplete="organization"
          onChange={(e) => setName(e.target.value)}
          className="h-16 w-full rounded-xl border-2 border-input bg-card px-4 text-xl"
        />
        {err ? <Message kind="error">{t("saveError")}</Message> : null}
        <button
          disabled={create.isPending}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xl font-bold text-primary-foreground disabled:opacity-60"
        >
          {create.isPending ? <Spinner /> : <Building2 aria-hidden />} {t("create")}
        </button>
      </form>
    </main>
  );
}
