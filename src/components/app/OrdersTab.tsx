import { useQuery } from "@tanstack/react-query";
import { Pizza } from "lucide-react";
import { ShareBar } from "./ShareBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Message } from "@/components/app/common";
import { useI18n } from "@/lib/i18n";
import { combineOrder, entriesQuery, sessionQuery } from "@/lib/manager-data";

export function OrdersTab({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const s = useQuery(sessionQuery(companyId));
  const e = useQuery(entriesQuery(s.data?.id));

  if (s.isLoading || e.isLoading) return <Skeleton className="h-64" />;
  const entries = (e.data ?? []).filter((x) => x.response_type !== "declined" && x.food_name);
  const lines = combineOrder(e.data ?? []);
  const text = lines.map((l) => `${l.n}x ${l.name}`).join("\n") +
    (entries.some((x) => x.food_comment)
      ? "\n\n" + entries.filter((x) => x.food_comment).map((x) => `${x.food_name}: ${x.food_comment}`).join("\n")
      : "");
  const title = `🍕 ${t("order")}${s.data ? ` – ${s.data.title} (${s.data.date})` : ""}`;
  const fullText = text + (entries.length
    ? `\n\n${t("whoOrdered")}:\n` + entries.map((x) => `• ${x.user_name}: ${x.food_name}${x.food_comment ? ` (${x.food_comment})` : ""}`).join("\n")
    : "");

  return (
    <>
      <section className="rounded-2xl border-2 bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Pizza className="size-7" aria-hidden /> {t("order")}
        </h2>
        {lines.length === 0 ? (
          <Message kind="info">{t("noOrders")}</Message>
        ) : (
          <>
            <ul className="space-y-2 text-2xl font-bold">
              {lines.map((l) => (
                <li key={l.name} className="rounded-xl bg-muted px-4 py-3">
                  {l.n}x {l.name}
                </li>
              ))}
            </ul>
            <ShareBar title={title} text={text} />
          </>
        )}
      </section>
      {entries.length > 0 ? (
        <section className="rounded-2xl border-2 bg-card p-5">
          <h2 className="mb-3 text-2xl font-bold">{t("whoOrdered")}</h2>
          <ul className="divide-y-2">
            {entries.map((x) => (
              <li key={x.id} className="py-3 text-lg">
                <span className="font-bold">{x.user_name}</span> — {x.food_name}
                {x.food_comment ? <span className="block text-muted-foreground">“{x.food_comment}”</span> : null}
              </li>
            ))}
          </ul>
          <ShareBar title={`🍕 ${t("whoOrdered")}${s.data ? ` – ${s.data.title} (${s.data.date})` : ""}`} text={fullText} />
        </section>
      ) : null}
    </>
  );
}
