import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { FileText, Trash2, Search, Download, Upload as UploadIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Library — DocMind AI" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function handleDelete(id: string, path: string | null) {
    if (!confirm("Delete this document and all its chunks?")) return;
    try {
      if (path) await supabase.storage.from("documents").remove([path]);
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleDownload(path: string | null, name: string) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Couldn't create download link");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  }

  const filtered = (docs ?? []).filter((d) => d.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell title="Document library">
      <div className="p-6 md:p-8 max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Link to="/upload">
            <Button className="gap-2">
              <UploadIcon className="size-4" /> Upload
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl border border-border bg-card/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/30 p-16 text-center">
            <FileText className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Upload your first PDF or notes to start chatting.</p>
            <Link to="/upload">
              <Button>Upload documents</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-border bg-card/30 p-5 hover:border-primary/30 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="size-10 rounded bg-primary/10 grid place-items-center text-primary text-[10px] font-mono uppercase">
                    {d.file_type.slice(0, 3)}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="font-semibold text-sm mb-1 line-clamp-2">{d.filename}</div>
                <div className="text-xs text-muted-foreground mb-4">
                  {d.total_pages} pages · {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(d.storage_path, d.filename)} className="gap-1">
                    <Download className="size-3.5" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id, d.storage_path)} className="gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}