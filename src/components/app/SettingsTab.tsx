import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Building2, LogOut, Save, ShieldCheck, Languages, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LangSwitch, Message, Spinner } from "@/components/app/common";
import { useI18n } from "@/lib/i18n";

export function SettingsTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(companyName);
  const [status, setStatus] = useState<"ok" | "err" | null>(null);

  const save = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("companies").update({ name: n }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      setStatus("ok");
      return qc.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: () => setStatus("err"),
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <section className="rounded-2xl border-2 bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold"><Building2 className="size-7" aria-hidden /> {t("companyName")}</h2>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => {
          e.preventDefault();
          const p = z.string().trim().min(1).max(100).safeParse(name);
          if (!p.success) return setStatus("err");
          save.mutate(p.data);
        }}>
          <label htmlFor="cn" className="sr-only">{t("companyName")}</label>
          <input id="cn" value={name} maxLength={100} onChange={(e) => { setName(e.target.value); setStatus(null); }}
            className="h-14 flex-1 rounded-xl border-2 border-input bg-card px-4 text-lg" />
          <button disabled={save.isPending} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-lg font-bold text-primary-foreground">
            {save.isPending ? <Spinner /> : <Save aria-hidden />} {t("save")}
          </button>
        </form>
        {status === "ok" ? <Message kind="success" className="mt-3">{t("saved")}</Message> : null}
        {status === "err" ? <Message kind="error" className="mt-3">{t("saveError")}</Message> : null}
      </section>
      <section className="rounded-2xl border-2 bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold"><Languages className="size-7" aria-hidden /> {t("lang")}</h2>
        <LangSwitch />
      </section>
      <section className="rounded-2xl border-2 bg-card p-5 text-lg">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold"><Smartphone className="size-7" aria-hidden /> {t("homeHint")}</h2>
        <p>{t("homeHintIos")}</p>
        <p>{t("homeHintAndroid")}</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/privacy" className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-lg font-bold">
          <ShieldCheck aria-hidden /> {t("privacy")}
        </Link>
        <button type="button" onClick={() => void logout()} className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-destructive text-lg font-bold text-destructive">
          <LogOut aria-hidden /> {t("logout")}
        </button>
      </div>
    </>
  );
}
