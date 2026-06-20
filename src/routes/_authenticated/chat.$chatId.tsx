import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askQuestion } from "@/lib/rag.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  head: () => ({ meta: [{ title: "Chat — DocMind AI" }] }),
  component: ChatRoom,
});

interface Citation {
  document_id: string;
  filename: string;
  page_number: number | null;
  chunk_index: number;
  snippet: string;
}

function ChatRoom() {
  const { chatId } = Route.useParams();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const ask = useServerFn(askQuestion);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, citations, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setSending(true);
    try {
      await ask({ data: { chatId, question: q } });
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get response");
      setInput(q);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {isLoading ? (
            <div className="text-center text-muted-foreground text-sm">Loading...</div>
          ) : !messages || messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              Ask anything about your documents.
            </div>
          ) : (
            messages.map((m: any) => <MessageBubble key={m.id} role={m.role} content={m.content} citations={m.citations as Citation[]} />)
          )}
          {sending && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold flex-shrink-0">D</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Retrieving and answering...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <form onSubmit={handleSend} className="border-t border-border bg-background/80 backdrop-blur-md p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2 p-2 rounded-xl border border-border bg-card/30 focus-within:border-primary/40 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            placeholder="Ask about your documents... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent resize-none px-3 py-2 text-sm outline-none placeholder:text-muted-foreground max-h-32"
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ role, content, citations }: { role: string; content: string; citations?: Citation[] }) {
  if (role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="bg-secondary text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold flex-shrink-0">D</div>
      <div className="flex-1 space-y-3 min-w-0">
        <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {citations && citations.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {citations.map((c, i) => (
              <span
                key={i}
                title={c.snippet}
                className="px-2 py-1 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-help"
              >
                [{i + 1}] {c.filename} {c.page_number ? `· p.${c.page_number}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}