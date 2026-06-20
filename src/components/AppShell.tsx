import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Upload,
  Menu,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      return { ...p, email: data.user.email } as { id?: string; email?: string; full_name?: string; avatar_url?: string };
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 size-10 grid place-items-center rounded-lg border border-border bg-card"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <Logo to="/dashboard" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="size-8 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold">
              {(profile?.full_name || profile?.email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{profile?.full_name || profile?.email}</div>
              <div className="text-[10px] text-muted-foreground truncate">{profile?.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
        />
      )}

      <main className="flex-1 min-w-0">
        {title && (
          <header className="h-16 border-b border-border flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur-md z-20">
            <h1 className="text-base font-semibold pl-12 md:pl-0">{title}</h1>
          </header>
        )}
        <div>{children}</div>
      </main>
    </div>
  );
}