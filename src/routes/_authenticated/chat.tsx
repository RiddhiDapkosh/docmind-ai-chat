import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — DocMind AI" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function newChat() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: u.user.id, title: "New chat" })
      .select("id").single();
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["chats"] });
    navigate({ to: "/chat/$chatId", params: { chatId: data.id } });
  }

  async function deleteChat(id: string) {
    if (!confirm("Delete this chat?")) return;
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["chats"] });
    if (pathname.includes(id)) navigate({ to: "/chat" });
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        <aside className="w-64 border-r border-border bg-card/30 flex flex-col">
          <div className="p-3 border-b border-border">
            <Button onClick={newChat} className="w-full gap-2 justify-start" size="sm">
              <Plus className="size-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {!chats || chats.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center p-6">No chats yet</div>
            ) : (
              chats.map((c) => {
                const active = pathname.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                      active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <MessageSquare className="size-3.5 flex-shrink-0" />
                    <Link to="/chat/$chatId" params={{ chatId: c.id }} className="flex-1 truncate">
                      {c.title}
                    </Link>
                    <button
                      onClick={() => deleteChat(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}