import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, MessageSquare, Upload as UploadIcon, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DocMind AI" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [docs, chats, msgs] = await Promise.all([
        supabase.from("documents").select("file_size", { count: "exact" }),
        supabase.from("chats").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      const totalBytes = (docs.data ?? []).reduce((s, d: any) => s + (d.file_size ?? 0), 0);
      return {
        docCount: docs.count ?? 0,
        chatCount: chats.count ?? 0,
        msgCount: msgs.count ?? 0,
        totalBytes,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, filename, file_type, status, created_at, chunk_count")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Dashboard">
      <div className="p-6 md:p-8 space-y-8 max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Documents" value={stats?.docCount ?? "—"} />
          <StatCard icon={MessageSquare} label="Chats" value={stats?.chatCount ?? "—"} />
          <StatCard icon={Sparkles} label="Messages" value={stats?.msgCount ?? "—"} />
          <StatCard icon={UploadIcon} label="Storage used" value={formatBytes(stats?.totalBytes ?? 0)} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <QuickAction
            to="/upload"
            icon={UploadIcon}
            title="Upload documents"
            body="Drag PDFs, DOCX, or notes into DocMind to start chatting with them."
          />
          <QuickAction
            to="/chat"
            icon={MessageSquare}
            title="Start a chat"
            body="Ask questions across your entire library. Every answer cites the source."
          />
          <QuickAction
            to="/documents"
            icon={FileText}
            title="Browse library"
            body="Search, filter, and manage your uploaded documents."
          />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent documents</h2>
            <Link to="/documents" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
            {!recent || recent.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="size-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No documents yet.</p>
                <Link to="/upload" className="text-sm text-primary hover:underline">Upload your first document →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((d: any) => (
                  <li key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
                    <div className="size-9 rounded bg-primary/10 grid place-items-center text-primary text-[10px] font-mono uppercase">
                      {d.file_type.split("/").pop()?.slice(0, 3) ?? "DOC"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, body }: { to: any; icon: any; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card/30 p-5 hover:border-primary/40 hover:bg-card/50 transition-all"
    >
      <Icon className="size-5 text-primary mb-4" />
      <div className="font-semibold mb-2 flex items-center gap-2">
        {title}
        <ArrowRight className="size-4 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "ready"
      ? "text-primary bg-primary/10 border-primary/20"
      : status === "failed"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : "text-muted-foreground bg-muted border-border";
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${color}`}>
      {status}
    </span>
  );
}

function formatBytes(b: number) {
  if (b === 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}