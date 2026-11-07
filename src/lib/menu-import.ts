import { z } from "zod";

export const MAX_MENU_BYTES = 10 * 1024 * 1024;
export const menuMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const importedDishSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
});
export type ImportedDish = z.infer<typeof importedDishSchema>;
export const scannedMenuSchema = z.object({ dishes: z.array(importedDishSchema).max(100) });
export const scanInputSchema = z.object({
  companyId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mime: z.enum(menuMimeTypes),
  base64: z.string().min(1).max(Math.ceil(MAX_MENU_BYTES / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export function newMenuDishes(dishes: ImportedDish[], existing: { name: string }[]) {
  const seen = new Set(existing.map((d) => d.name.trim().toLowerCase()));
  return dishes.filter((dish) => {
    const key = dish.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}