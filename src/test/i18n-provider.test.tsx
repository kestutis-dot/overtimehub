import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/lib/i18n";

function Consumer() {
  const { t, setLang } = useI18n();
  return <><span>{t("scanMenu")}</span><button onClick={() => setLang("en")}>English</button></>;
}

afterEach(() => { cleanup(); localStorage.clear(); });
describe("Language provider", () => {
  it("preserves a chosen language when its children update", () => {
    localStorage.setItem("otm-lang", "no");
    const view = render(<I18nProvider><Consumer /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    view.rerender(<I18nProvider><Consumer /><span>Updated</span></I18nProvider>);
    expect(screen.getByText("Scan menu")).toBeInTheDocument();
    expect(localStorage.getItem("otm-lang")).toBe("en");
  });
});