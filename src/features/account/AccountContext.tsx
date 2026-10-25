"use client";

// Акаунт відвідувача на вітрині: сесія Supabase Auth + профіль із profiles.
// Роль тут лише для UI (показати кнопку «Адмінка»); доступ до /admin вирішує
// middleware на сервері.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AccountRole = "admin" | "editor" | "customer";

export interface Account {
  id: string;
  email: string;
  role: AccountRole;
  fullName: string;
  phone: string;
  defaultAddress: string;
  /** вхід через Google — пароль і email міняються не тут */
  viaGoogle: boolean;
}

interface Value {
  account: Account | null;
  loading: boolean;
  isStaff: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Value>({
  account: null, loading: true, isStaff: false, refresh: async () => {}, signOut: async () => {},
});

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async (au: AuthUser | null) => {
    if (!au) { setAccount(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, phone, default_address")
      .eq("id", au.id)
      .maybeSingle();
    const meta = au.user_metadata ?? {};
    const providers = (au.app_metadata?.providers as string[] | undefined) ?? [];
    setAccount({
      id: au.id,
      email: au.email ?? "",
      role: (data?.role as AccountRole) ?? "customer",
      fullName: data?.full_name ?? (meta.full_name as string) ?? (meta.name as string) ?? "",
      phone: data?.phone ?? "",
      defaultAddress: data?.default_address ?? "",
      viaGoogle: providers.includes("google") && !providers.includes("email"),
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => resolve(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // оновлення токена профіль не змінює — зайвий запит ні до чого
      if (event === "TOKEN_REFRESHED") return;
      resolve(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, resolve]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await resolve(data.user);
  }, [supabase, resolve]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccount(null);
  }, [supabase]);

  const isStaff = account?.role === "admin" || account?.role === "editor";

  return <Ctx.Provider value={{ account, loading, isStaff, refresh, signOut }}>{children}</Ctx.Provider>;
}

export function useAccount(): Value {
  return useContext(Ctx);
}
