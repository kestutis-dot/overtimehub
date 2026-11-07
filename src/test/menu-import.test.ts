import { describe, expect, it } from "vitest";
import { newMenuDishes, scannedMenuSchema, scanInputSchema } from "@/lib/menu-import";

describe("Menu import", () => {
  it("keeps editable names and categories without importing prices", () => {
    expect(scannedMenuSchema.parse({ dishes: [{ name: " Pepperoni ", category: "Pizza", price: 150 }] })).toEqual({ dishes: [{ name: "Pepperoni", category: "Pizza" }] });
  });
  it("does not reimport existing dishes or duplicates regardless of case", () => {
    expect(newMenuDishes([{ name: "PEPPERONI", category: "Pizza" }, { name: "Kebab", category: "Kebab" }, { name: " kebab ", category: "Mat" }], [{ name: "Pepperoni" }])).toEqual([{ name: "Kebab", category: "Kebab" }]);
  });
  it("rejects unsupported executable uploads", () => {
    expect(scanInputSchema.safeParse({ companyId: "809db5f7-c662-493a-9f89-eeb252edb9c0", filename: "menu.exe", mime: "application/octet-stream", base64: "YWJj" }).success).toBe(false);
  });
  it("rejects blank extracted dish names", () => {
    expect(scannedMenuSchema.safeParse({ dishes: [{ name: " ", category: "Pizza" }] }).success).toBe(false);
  });
});