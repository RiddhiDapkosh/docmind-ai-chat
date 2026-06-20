import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ingestChunks } from "@/lib/rag.functions";
import { parseFile, chunkPages } from "@/lib/document-parser";
import { Upload as UploadIcon, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload — DocMind AI" }] }),
  component: UploadPage,
});

type Status = "queued" | "parsing" | "uploading" | "embedding" | "done" | "error";

interface FileEntry {
  file: File;
  status: Status;
  progress: number;
  error?: string;
}

function UploadPage() {
  const [items, setItems] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const ingest = useServerFn(ingestChunks);
  const navigate = useNavigate();

  const onFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith(".pdf") || n.endsWith(".docx") || n.endsWith(".txt") || n.endsWith(".md") || n.endsWith(".markdown");
      });
      if (incoming.length === 0) {
        toast.error("Only PDF, DOCX, TXT, and Markdown files are supported");
        return;
      }
      const entries: FileEntry[] = incoming.map((file) => ({ file, status: "queued", progress: 0 }));
      setItems((prev) => [...prev, ...entries]);
      void processAll(entries);
    },
    [],
  );

  async function processAll(entries: FileEntry[]) {
    for (const entry of entries) {
      await processOne(entry);
    }
  }

  function updateEntry(file: File, patch: Partial<FileEntry>) {
    setItems((prev) => prev.map((it) => (it.file === file ? { ...it, ...patch } : it)));
  }

  async function processOne(entry: FileEntry) {
    const { file } = entry;
    try {
      updateEntry(file, { status: "parsing", progress: 10 });
      const parsed = await parseFile(file);
      const chunks = chunkPages(parsed.pages, 800, 120);
      if (chunks.length === 0) throw new Error("No extractable text in this file");

      updateEntry(file, { status: "uploading", progress: 30 });
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const { data: docRow, error: docErr } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          filename: file.name,
          file_type: ext,
          file_size: file.size,
          total_pages: parsed.totalPages,
          storage_path: path,
          status: "processing",
        })
        .select("id").single();
      if (docErr) throw docErr;

      updateEntry(file, { status: "embedding", progress: 60 });
      await ingest({ data: { documentId: docRow.id, chunks } });

      updateEntry(file, { status: "done", progress: 100 });
      toast.success(`${file.name} indexed (${chunks.length} chunks)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateEntry(file, { status: "error", error: msg });
      toast.error(`${file.name}: ${msg}`);
    }
  }

  return (
    <AppShell title="Upload documents">
      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`rounded-2xl border-2 border-dashed transition-colors p-12 text-center ${
            dragging ? "border-primary bg-primary/5" : "border-border bg-card/30"
          }`}
        >
          <UploadIcon className="size-10 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Drop files here</h2>
          <p className="text-sm text-muted-foreground mb-6">PDF · DOCX · TXT · Markdown — up to ~25 MB each</p>
          <label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.markdown"
              className="hidden"
              onChange={(e) => e.target.files && onFiles(e.target.files)}
            />
            <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg cursor-pointer hover:bg-primary/90">
              Choose files
            </span>
          </label>
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Processing queue</h3>
              {items.every((i) => i.status === "done" || i.status === "error") && (
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/documents" })}>
                  Go to library →
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={idx} className="rounded-lg border border-border bg-card/30 p-4 flex items-center gap-4">
                  <FileText className="size-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{it.file.name}</span>
                      <StatusIcon status={it.status} />
                    </div>
                    <div className="mt-2">
                      <Progress value={it.progress} className="h-1" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.status === "error" ? it.error : statusLabel(it.status)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function statusLabel(s: Status) {
  switch (s) {
    case "queued": return "Queued";
    case "parsing": return "Extracting text...";
    case "uploading": return "Uploading to storage...";
    case "embedding": return "Generating embeddings...";
    case "done": return "Indexed and ready to chat";
    case "error": return "Failed";
  }
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <CheckCircle2 className="size-4 text-primary" />;
  if (status === "error") return <XCircle className="size-4 text-destructive" />;
  return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
}