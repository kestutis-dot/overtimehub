import { useI18n } from "@/lib/i18n";

/** Two clear selects: hours + minutes (15-min steps). Value in decimal hours. */
export function DurationPicker({
  value,
  onChange,
  max = 24,
  id,
  tabIndex,
}: {
  value: number;
  onChange: (h: number) => void;
  max?: number;
  id?: string;
  tabIndex?: number;
}) {
  const { lang } = useI18n();
  const hLabel = lang === "no" ? "Timer" : "Hours";
  const mLabel = lang === "no" ? "Minutter" : "Minutes";
  const v = Number.isFinite(value) ? Math.max(0, value) : 0;
  const h = Math.floor(v + 1e-9);
  const m = Math.round((v - h) * 60 / 15) * 15;
  const maxH = Math.floor(max + 1e-9);
  const set = (nh: number, nm: number) => {
    let total = nh + nm / 60;
    if (total > max) total = max;
    onChange(total);
  };
  const sel = "h-16 w-full rounded-xl border-2 border-input bg-card px-3 text-center text-2xl font-bold";
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-lg font-bold">
        {hLabel}
        <select id={id} tabIndex={tabIndex} className={sel} value={h} onChange={(e) => set(Number(e.target.value), m)}>
          {Array.from({ length: maxH + 1 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className="block text-lg font-bold">
        {mLabel}
        <select tabIndex={tabIndex} className={sel} value={m} onChange={(e) => set(h, Number(e.target.value))}>
          {[0, 15, 30, 45].map((x) => (
            <option key={x} value={x} disabled={h + x / 60 > max}>{String(x).padStart(2, "0")}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
