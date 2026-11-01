import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Eye, EyeOff, Plus, Trash2, Pizza } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Confirm, Message, Spinner } from "@/components/app/common";
import { useI18n, type TKey } from "@/lib/i18n";
import { menuQuery, type Dish } from "@/lib/manager-data";
import { cn } from "@/lib/utils";

const dishSchema = z.object({ name: z.string().trim().min(1).max(80), category: z.string().trim().min(1).max(40) });

export function MenuTab({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery(menuQuery(companyId));
  const key = menuQuery(companyId).queryKey;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Pizza");
  const [err, setErr] = useState<TKey | null>(null);
  const [toDelete, setToDelete] = useState<Dish | null>(null);

  const add = useMutation({
    mutationFn: async (d: { name: string; category: string }) => {
      const { error } = await supabase.from("food_menus").insert({ company_id: companyId, ...d });
      if (error) throw error;
    },
    onMutate: async (d) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => [
        ...(old ?? []),
        { id: `tmp-${Date.now()}`, company_id: companyId, is_visible: true, created_at: new Date().toISOString(), ...d },
      ]);
      return { prev };
    },
    onError: (e: { code?: string }, _d, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      setErr(e.code === "23505" ? "dupDish" : "saveError");
    },
    onSuccess: () => setName(""),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async (d: { id: string; is_visible: boolean }) => {
      const { error } = await supabase.from("food_menus").update({ is_visible: d.is_visible }).eq("id", d.id);
      if (error) throw error;
    },
    onMutate: (d) => {
      qc.setQueryData(key, (old) => old?.map((x) => (x.id === d.id ? { ...x, is_visible: d.is_visible } : x)));
    },
    onError: () => setErr("saveError"),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_menus").delete().eq("id", id);
      if (error) throw error;
    },
    onError: () => setErr("saveError"),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  function submit() {
    const p = dishSchema.safeParse({ name, category });
    if (!p.success) return;
    if ((q.data ?? []).some((d) => d.name.toLowerCase() === p.data.name.toLowerCase())) return setErr("dupDish");
    setErr(null);
    add.mutate(p.data);
  }

  return (
    <>
      <section className="rounded-2xl border-2 bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Plus className="size-7" aria-hidden /> {t("addDish")}
        </h2>
        <form
          className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="dname" className="block text-lg font-bold">{t("dishName")}</label>
            <input id="dname" autoComplete="off" maxLength={80} value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg" />
          </div>
          <div>
            <label htmlFor="dcat" className="block text-lg font-bold">{t("category")}</label>
            <input id="dcat" autoComplete="off" maxLength={40} value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg" />
          </div>
          <button disabled={add.isPending} className="flex h-14 items-center justify-center gap-2 self-end rounded-xl bg-primary px-6 text-lg font-bold text-primary-foreground disabled:opacity-60">
            {add.isPending ? <Spinner /> : <Plus aria-hidden />} {t("add")}
          </button>
        </form>
        {err ? <Message kind="error" className="mt-3">{t(err)}</Message> : null}
      </section>

      <section className="rounded-2xl border-2 bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Pizza className="size-7" aria-hidden /> {t("tabMenu")}
        </h2>
        {q.isLoading ? <Skeleton className="h-40" /> : (q.data ?? []).length === 0 ? (
          <Message kind="info">{t("noDishes")}</Message>
        ) : (
          <ul className="divide-y-2">
            {(q.data ?? []).map((d) => (
              <li key={d.id} className={cn("flex flex-wrap items-center gap-3 py-3", !d.is_visible && "opacity-60")}>
                <div className="min-w-0 flex-1 text-lg">
                  <span className="font-bold">{d.name}</span>
                  <span className="block text-muted-foreground">{d.category}{!d.is_visible ? ` · ${t("hidden")}` : ""}</span>
                </div>
                <button type="button" disabled={d.id.startsWith("tmp-")}
                  onClick={() => update.mutate({ id: d.id, is_visible: !d.is_visible })}
                  className="flex h-14 items-center gap-2 rounded-xl border-2 px-4 text-lg font-bold">
                  {d.is_visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />} {d.is_visible ? t("hide") : t("show")}
                </button>
                <button type="button" disabled={d.id.startsWith("tmp-")} onClick={() => setToDelete(d)}
                  className="flex h-14 items-center gap-2 rounded-xl border-2 border-destructive px-4 text-lg font-bold text-destructive">
                  <Trash2 aria-hidden /> {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Confirm
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("deleteDishQ")}
        description={toDelete?.name ?? ""}
        confirmLabel={t("delete")}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </>
  );
}
