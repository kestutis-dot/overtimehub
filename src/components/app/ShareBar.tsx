import { useState } from "react";
import { Check, Printer, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const btn = "flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-primary px-4 text-lg font-bold";

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

/** Two buttons: share summary text, and print it on a clean sheet. */
export function ShareBar({ title, text }: { title: string; text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const share = () => {
    if (navigator.share) void navigator.share({ title, text }).catch(() => undefined);
    else void navigator.clipboard.writeText(text).then(() => setCopied(true));
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#000}h1{font-size:26px;margin:0 0 16px}pre{font:20px/1.6 system-ui,sans-serif;white-space:pre-wrap;margin:0}</style></head><body><h1>${esc(title)}</h1><pre>${esc(text)}</pre></body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  return (
    <div className="no-print mt-4 grid grid-cols-2 gap-3">
      <button type="button" className={btn} onClick={share}>
        {copied ? <Check aria-hidden className="shrink-0" /> : <Share2 aria-hidden className="shrink-0" />} {copied ? t("copied") : t("share")}
      </button>
      <button type="button" className={btn} onClick={print}>
        <Printer aria-hidden className="shrink-0" /> {t("print")}
      </button>
    </div>
  );
}
