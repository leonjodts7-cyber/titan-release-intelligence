"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/client-factory";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase() || "?";
}

export function SidebarUser() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) {
      router.push("/");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="px-3 py-2.5 border-t border-titan-border">
        <div className="h-10 rounded-md bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  if (!email) return null;

  return (
    <div className="px-3 py-2.5 border-t border-titan-border">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full bg-titan-accent/15 border border-titan-accent/30 flex items-center justify-center shrink-0"
          aria-hidden
        >
          <span className="text-[10px] font-semibold text-titan-accent">
            {initialsFromEmail(email)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-300 truncate" title={email}>
            {email}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="p-1.5 rounded-md text-titan-muted hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
          aria-label="Uitloggen"
          title="Uitloggen"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
