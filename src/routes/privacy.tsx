import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LangSwitch, Logo } from "@/components/app/common";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Personvern – Overtid & Mat" },
      { name: "description", content: "Hvordan Overtid & Mat lagrer navn, matvalg og e-post." },
      { property: "og:title", content: "Personvern – Overtid & Mat" },
      { property: "og:description", content: "Hvordan Overtid & Mat lagrer navn, matvalg og e-post." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { lang, t } = useI18n();
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <Logo />
        <LangSwitch />
      </header>
      <h1 className="mb-4 flex items-center gap-2 text-3xl font-bold">
        <ShieldCheck className="size-8" aria-hidden /> {t("privacy")}
      </h1>
      {lang === "no" ? (
        <div className="space-y-4 text-lg">
          <p>Vi lagrer navnet ditt, svaret ditt og matvalget ditt for overtidslisten.</p>
          <p>Bare lederne i firmaet ditt ser dette.</p>
          <p>Ledernes e-post brukes bare til innlogging.</p>
          <p>Vil du at vi sletter dataene dine? Spør lederen din.</p>
        </div>
      ) : (
        <div className="space-y-4 text-lg">
          <p>We store your name, your answer and your food choice for the overtime list.</p>
          <p>Only managers in your company see this.</p>
          <p>Managers' emails are used only for login.</p>
          <p>Want your data deleted? Ask your manager.</p>
        </div>
      )}
      <Link to="/" className="mt-8 inline-flex h-14 items-center gap-2 rounded-xl border-2 px-5 text-lg font-bold">
        <ArrowLeft aria-hidden /> {t("back")}
      </Link>
    </main>
  );
}
