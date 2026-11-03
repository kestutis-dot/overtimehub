import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// To add a language: add it to LANGS and add a dictionary with the same keys.
export const LANGS = [
  { code: "no", flag: "🇳🇴", label: "Norsk", locale: "nb-NO" },
  { code: "en", flag: "🇬🇧", label: "English", locale: "en-GB" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const no = {
  appName: "Overtid & Mat",
  lang: "Språk",
  hoursN: "{n} timer",
  withFood: "Med mat",
  noFood: "Uten mat",
  closed: "Stengt",
  closedHelp: "Du kan ikke svare nå.",
  badLink: "Linken virker ikke",
  badLinkHelp: "Spør lederen om en ny link.",
  loading: "Laster …",
  name: "Navn",
  namePh: "Skriv navnet ditt",
  food: "Mat",
  foodHead: "Velg mat (hvis du kan jobbe)",
  comment: "Kommentar (valgfritt)",
  commentPh: "F.eks. uten løk",
  answer: "Svar",
  full: "Jeg kan hele tiden",
  partial: "Jeg kan deler av tiden",
  declined: "Jeg kan ikke",
  howMany: "Hvor mange timer?",
  maxHours: "Maks {n} timer",
  ok: "OK",
  saved: "Lagret!",
  youSaid: "Du sa: {a}.",
  foodIs: "Mat: {f}.",
  change: "Endre",
  changeAnswer: "Endre svar",
  savedBefore: "Du har allerede svart",
  pillFull: "Hele tiden",
  pillPartial: "Deler av tiden: {n} t",
  pillDeclined: "Kan ikke",
  errName: "Skriv navnet ditt først.",
  errNameLong: "Navnet er for langt.",
  errDish: "Velg mat først. Se over.",
  errHours: "Skriv timer mellom 0 og {n}.",
  errClosed: "Det er stengt. Spør lederen.",
  errLink: "Linken virker ikke.",
  errResponse: "Noe gikk galt. Prøv igjen.",
  errGeneric: "Noe gikk galt. Prøv igjen.",
  privacy: "Personvern",
  // manager
  login: "Logg inn",
  email: "E-post",
  sendCode: "Send innloggingslenke",
  codeSent: "Vi har sendt en innloggingslenke til {e}. Åpne e-posten og trykk på lenken for å logge inn.",
  enterCode: "Sjekk e-posten din",
  resendIn: "Send på nytt om {s} s",
  resend: "Send på nytt",
  otherEmail: "Bruk en annen e-post",
  errEmail: "Skriv en gyldig e-post.",
  errCode: "Feil eller gammel kode. Prøv igjen.",
  errWait: "For mange forsøk. Vent noen minutter.",
  createCompany: "Lag firma",
  companyName: "Firmanavn",
  create: "Lag",
  tabAnswers: "Svar",
  tabOrders: "Bestilling",
  tabMenu: "Meny",
  tabSettings: "Innstillinger",
  live: "Live",
  offline: "Frakoblet",
  noRequest: "Ingen forespørsel ennå",
  noRequestHelp: "Lag en ny forespørsel.",
  newRequest: "Ny forespørsel",
  edit: "Endre",
  close: "Steng",
  reopen: "Åpne igjen",
  open: "Åpen",
  title: "Tittel",
  date: "Dato",
  estHours: "Timer (ca.)",
  includesFood: "Med mat",
  save: "Lagre",
  cancel: "Avbryt",
  linkCard: "Link til ansatte",
  copy: "Kopier",
  copied: "Kopiert!",
  whatsapp: "WhatsApp",
  sms: "SMS",
  share: "Del",
  showQr: "QR-kode",
  print: "Skriv ut",
  newLink: "Ny lenke",
  newLinkQ: "Lage ny link?",
  newLinkHelp: "Den gamle linken slutter å virke.",
  closeQ: "Stenge forespørselen?",
  closeHelp: "De ansatte kan ikke svare mer.",
  deleteQ: "Slette dette svaret?",
  deleteDishQ: "Slette denne retten?",
  delete: "Slett",
  yes: "Ja",
  totals: "Oversikt",
  totalHours: "Timer totalt",
  answers: "Svar",
  noAnswers: "Ingen svar ennå",
  noAnswersHelp: "Del linken med de ansatte.",
  warnHours: "Flere timer enn planlagt",
  warnDish: "Mangler mat",
  order: "Samlet bestilling",
  noOrders: "Ingen bestillinger ennå",
  whoOrdered: "Hvem bestilte hva",
  addDish: "Legg til rett",
  dishName: "Navn på rett",
  category: "Kategori",
  add: "Legg til",
  hide: "Skjul",
  show: "Vis",
  hidden: "Skjult",
  dupDish: "Den retten finnes allerede.",
  noDishes: "Ingen retter ennå",
  logout: "Logg ut",
  saveError: "Kunne ikke lagre. Prøv igjen.",
  inviteText: "Kan du jobbe overtid? Svar her:",
  homeHint: "Tips: Legg appen på hjemskjermen.",
  homeHintIos: "iPhone: Trykk Del, så «Legg til på Hjem-skjerm».",
  homeHintAndroid: "Android: Trykk ⋮, så «Legg til på startskjermen».",
  back: "Tilbake",
} as const;

export type TKey = keyof typeof no;

const en: Record<TKey, string> = {
  appName: "Overtid & Mat",
  lang: "Language",
  hoursN: "{n} hours",
  withFood: "With food",
  noFood: "No food",
  closed: "Closed",
  closedHelp: "You cannot answer now.",
  badLink: "This link does not work",
  badLinkHelp: "Ask your manager for a new link.",
  loading: "Loading …",
  name: "Name",
  namePh: "Write your name",
  food: "Food",
  foodHead: "Choose food (if you can work)",
  comment: "Comment (optional)",
  commentPh: "E.g. no onion",
  answer: "Answer",
  full: "I can work all the time",
  partial: "I can work some of the time",
  declined: "I cannot work",
  howMany: "How many hours?",
  maxHours: "Max {n} hours",
  ok: "OK",
  saved: "Saved!",
  youSaid: "You said: {a}.",
  foodIs: "Food: {f}.",
  change: "Change",
  changeAnswer: "Change answer",
  savedBefore: "You already answered",
  pillFull: "Full Time",
  pillPartial: "Partial Time: {n} h",
  pillDeclined: "Declined",
  errName: "Write your name first.",
  errNameLong: "The name is too long.",
  errDish: "Choose food first. See above.",
  errHours: "Write hours between 0 and {n}.",
  errClosed: "It is closed. Ask your manager.",
  errLink: "This link does not work.",
  errResponse: "Something went wrong. Try again.",
  errGeneric: "Something went wrong. Try again.",
  privacy: "Privacy",
  login: "Log in",
  email: "Email",
  sendCode: "Send login link",
  codeSent: "We sent a login link to {e}. Open the email and click the link to sign in.",
  enterCode: "Check your email",
  resendIn: "Resend in {s} s",
  resend: "Resend",
  otherEmail: "Use another email",
  errEmail: "Write a valid email.",
  errCode: "Wrong or old code. Try again.",
  errWait: "Too many tries. Wait a few minutes.",
  createCompany: "Create company",
  companyName: "Company name",
  create: "Create",
  tabAnswers: "Answers",
  tabOrders: "Orders",
  tabMenu: "Menu",
  tabSettings: "Settings",
  live: "Live",
  offline: "Offline",
  noRequest: "No request yet",
  noRequestHelp: "Make a new request.",
  newRequest: "New request",
  edit: "Edit",
  close: "Close",
  reopen: "Reopen",
  open: "Open",
  title: "Title",
  date: "Date",
  estHours: "Hours (about)",
  includesFood: "With food",
  save: "Save",
  cancel: "Cancel",
  linkCard: "Link to employees",
  copy: "Copy",
  copied: "Copied!",
  whatsapp: "WhatsApp",
  sms: "SMS",
  share: "Share",
  showQr: "QR code",
  print: "Print",
  newLink: "New link",
  newLinkQ: "Make a new link?",
  newLinkHelp: "The old link stops working.",
  closeQ: "Close the request?",
  closeHelp: "Employees cannot answer any more.",
  deleteQ: "Delete this answer?",
  deleteDishQ: "Delete this dish?",
  delete: "Delete",
  yes: "Yes",
  totals: "Overview",
  totalHours: "Total hours",
  answers: "Answers",
  noAnswers: "No answers yet",
  noAnswersHelp: "Share the link with employees.",
  warnHours: "More hours than planned",
  warnDish: "Food missing",
  order: "Combined order",
  noOrders: "No orders yet",
  whoOrdered: "Who ordered what",
  addDish: "Add dish",
  dishName: "Dish name",
  category: "Category",
  add: "Add",
  hide: "Hide",
  show: "Show",
  hidden: "Hidden",
  dupDish: "That dish already exists.",
  noDishes: "No dishes yet",
  logout: "Log out",
  saveError: "Could not save. Try again.",
  inviteText: "Can you work overtime? Answer here:",
  homeHint: "Tip: Add the app to your home screen.",
  homeHintIos: "iPhone: Tap Share, then “Add to Home Screen”.",
  homeHintAndroid: "Android: Tap ⋮, then “Add to Home screen”.",
  back: "Back",
};

const dicts: Record<Lang, Record<TKey, string>> = { no, en };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey, vars?: Record<string, string | number>) => string;
  num: (n: number) => string;
  date: (d: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE = "otm-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("no");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE);
    if (saved === "no" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "no" ? "nb" : "en";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE, l);
  }, []);
  const value = useMemo<Ctx>(() => {
    const locale = LANGS.find((l) => l.code === lang)?.locale ?? "nb-NO";
    return {
      lang,
      setLang,
      t: (k, vars) => {
        let s = dicts[lang][k];
        if (vars) for (const [v, val] of Object.entries(vars)) s = s.replace(`{${v}}`, String(val));
        return s;
      },
      num: (n) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n),
      date: (d) =>
        new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
          new Date(`${d}T12:00:00`),
        ),
    };
  }, [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

/** Parses "1,5" or "1.5". Returns NaN when invalid. */
export function parseHours(input: string): number {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}
