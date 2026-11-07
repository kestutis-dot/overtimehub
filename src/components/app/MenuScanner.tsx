import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FileUp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, Spinner } from "@/components/app/common";
import { useI18n, type TKey } from "@/lib/i18n";
import { MAX_MENU_BYTES, menuMimeTypes, newMenuDishes, importedDishSchema, type ImportedDish } from "@/lib/menu-import";
import { scanMenu } from "@/lib/menu-scan.functions";
import { menuQuery } from "@/lib/manager-data";
import { supabase } from "@/integrations/supabase/client";

type ReviewDish = ImportedDish & { selected: boolean };

export function MenuScanner({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const extract = useServerFn(scanMenu);
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [rows, setRows] = useState<ReviewDish[] | null>(null);
  const [busy, setBusy] = useState<"scan" | "save" | null>(null);
  const [error, setError] = useState<TKey | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  useEffect(() => {
    if (!file || file.type === "application/pdf") { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(selected: File | undefined) {
    if (!selected) return;
    setError(null); setSaved(null); setRows(null);
    if (!menuMimeTypes.some((mime) => mime === selected.type) || selected.size > MAX_MENU_BYTES || selected.size === 0) {
      setFile(null); setError("scanFileError"); return;
    }
    setFile(selected);
  }

  async function scan() {
    if (!file || busy) return;
    setBusy("scan"); setError(null); setSaved(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("file"));
        reader.onerror = () => reject(new Error("file"));
        reader.readAsDataURL(file);
      });
      const result = await extract({ data: { companyId, filename: file.name, mime: file.type, base64: dataUrl.split(",")[1] ?? "" } });
      if (result.error) setError(result.error);
      else setRows((result.dishes ?? []).map((d) => ({ ...d, selected: true })));
    } catch { setError("scanError"); }
    finally { setBusy(null); }
  }

  const selected = (rows ?? []).filter((row) => row.selected);
  const valid = selected.length > 0 && selected.every((row) => importedDishSchema.safeParse(row).success);
  async function save() {
    if (!valid || busy) return;
    setBusy("save"); setError(null);
    try {
      const existing = await supabase.from("food_menus").select("name").eq("company_id", companyId);
      if (existing.error) throw existing.error;
      const dishes = newMenuDishes(selected.map((row) => importedDishSchema.parse(row)), existing.data ?? []);
      if (dishes.length === 0) { setError("scanDuplicates"); return; }
      const result = await supabase.from("food_menus").insert(dishes.map((dish) => ({ ...dish, company_id: companyId })));
      if (result.error) { setError(result.error.code === "23505" ? "scanDuplicates" : "saveError"); return; }
      await qc.invalidateQueries({ queryKey: menuQuery(companyId).queryKey });
      setSaved(dishes.length); setRows(null); setFile(null);
      if (input.current) input.current.value = "";
    } catch { setError("saveError"); }
    finally { setBusy(null); }
  }

  return (
    <section className="space-y-4 border-b-2 pb-5">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><ScanLine className="size-7 shrink-0" aria-hidden />{t("scanMenu")}</h2>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
        aria-label={t("scanUpload")} disabled={!!busy} onChange={(e) => chooseFile(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="h-14 whitespace-normal px-4 text-lg font-bold" disabled={!!busy} onClick={() => input.current?.click()}><FileUp aria-hidden />{t("scanUpload")}</Button>
        {file && !rows ? <Button className="h-14 px-4 text-lg font-bold" disabled={!!busy} onClick={scan}>{busy === "scan" ? <Spinner /> : <ScanLine aria-hidden />}{t(busy === "scan" ? "scanReading" : "scanStart")}</Button> : null}
      </div>
      {file ? <p className="break-words text-base text-muted-foreground">{file.name}</p> : null}
      {preview ? <img src={preview} alt={t("scanPreview")} className="max-h-64 max-w-full rounded-lg object-contain" /> : null}
      {busy === "scan" ? <p role="status" className="text-muted-foreground">{t("scanReading")}</p> : null}
      {rows ? rows.length === 0 ? <Message kind="info">{t("scanEmpty")}</Message> : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">{t("scanReview", { n: rows.length })}</h3>
          <ul className="divide-y-2">
            {rows.map((row, index) => (
              <li key={index} className="flex gap-3 py-3">
                <input type="checkbox" className="mt-3 size-5 shrink-0 accent-primary" checked={row.selected} disabled={!!busy}
                  aria-label={t("scanSelect", { n: index + 1 })} onChange={(e) => setRows((old) => old?.map((r, i) => i === index ? { ...r, selected: e.target.checked } : r) ?? null)} />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  {(["name", "category"] as const).map((field) => (
                    <label key={field} className="min-w-0 text-base font-bold">{t(field === "name" ? "dishName" : "category")}
                      <input className="mt-1 h-12 w-full min-w-0 rounded-lg border-2 border-input bg-card px-3 text-lg font-normal" value={row[field]} disabled={!!busy}
                        maxLength={field === "name" ? 80 : 40} onChange={(e) => setRows((old) => old?.map((r, i) => i === index ? { ...r, [field]: e.target.value } : r) ?? null)} />
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Button className="h-auto min-h-14 w-full whitespace-normal px-4 text-lg font-bold" disabled={!valid || !!busy} onClick={save}>{busy === "save" ? <Spinner /> : <Check aria-hidden />}{t("scanSave", { n: selected.length })}</Button>
        </div>
      ) : null}
      {error ? <Message kind="error">{t(error)}</Message> : null}
      {saved !== null ? <Message kind="info">{t("scanSaved", { n: saved })}</Message> : null}
    </section>
  );
}