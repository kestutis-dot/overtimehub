import { useEffect, useState } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Session = Database["public"]["Tables"]["overtime_sessions"]["Row"];
export type Entry = Database["public"]["Tables"]["overtime_entries"]["Row"];
export type Dish = Database["public"]["Tables"]["food_menus"]["Row"];

export const membershipQuery = () =>
  queryOptions({
    queryKey: ["membership"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("company_id, role, companies(name)")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const sessionQuery = (companyId: string) =>
  queryOptions({
    queryKey: ["session", companyId],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_sessions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const entriesQuery = (sessionId: string | undefined) =>
  queryOptions({
    queryKey: ["entries", sessionId],
    enabled: !!sessionId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_entries")
        .select("*")
        .eq("session_id", sessionId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const menuQuery = (companyId: string) =>
  queryOptions({
    queryKey: ["menu", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_menus")
        .select("*")
        .eq("company_id", companyId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

/** Realtime subscription that invalidates queries; returns live status. */
export function useLive(companyId: string) {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  useEffect(() => {
    const channel = supabase
      .channel(`company-${companyId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "overtime_entries", filter: `company_id=eq.${companyId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["entries"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "overtime_sessions", filter: `company_id=eq.${companyId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["session", companyId] });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, qc]);
  return live;
}

export function shareUrl(token: string) {
  return `${window.location.origin}/r/${token}`;
}

/** "3x Pepperoni" lines from entries that ordered food. */
export function combineOrder(entries: Entry[]) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.response_type === "declined" || !e.food_name) continue;
    counts.set(e.food_name, (counts.get(e.food_name) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
}

export function totals(entries: Entry[]) {
  let full = 0, partial = 0, declined = 0, hours = 0;
  for (const e of entries) {
    if (e.response_type === "full") full++;
    else if (e.response_type === "partial") partial++;
    else declined++;
    hours += Number(e.hours ?? 0);
  }
  return { full, partial, declined, hours };
}
