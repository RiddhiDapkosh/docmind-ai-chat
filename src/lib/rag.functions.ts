import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChunkSchema = z.object({
  content: z.string().min(1),
  page_number: z.number().int().nonnegative(),
  chunk_index: z.number().int().nonnegative(),
});

const IngestSchema = z.object({
  documentId: z.string().uuid(),
  chunks: z.array(ChunkSchema).min(1).max(2000),
});

// Embed chunks server-side and write them into document_chunks. Marks the
// document `ready` on success, `failed` on error.
export const ingestChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => IngestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { documentId, chunks } = data;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify ownership
    const { data: doc, error: docErr } = await supabase
      .from("documents").select("id, user_id").eq("id", documentId).maybeSingle();
    if (docErr || !doc || doc.user_id !== userId) throw new Error("Document not found");

    try {
      const { embedTexts } = await import("./ai-gateway.server");
      const embeddings = await embedTexts(apiKey, chunks.map((c) => c.content));

      const rows = chunks.map((c, i) => ({
        document_id: documentId,
        user_id: userId,
        chunk_index: c.chunk_index,
        content: c.content,
        page_number: c.page_number,
        embedding: embeddings[i] as unknown as string, // pgvector accepts arrays
      }));

      // Insert in batches to avoid request size limits
      for (let i = 0; i < rows.length; i += 200) {
        const slice = rows.slice(i, i + 200);
        const { error } = await supabase.from("document_chunks").insert(slice as any);
        if (error) throw error;
      }

      await supabase
        .from("documents")
        .update({ status: "ready", chunk_count: chunks.length })
        .eq("id", documentId);

      return { ok: true, count: chunks.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("documents")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", documentId);
      throw new Error(msg);
    }
  });

const AskSchema = z.object({
  chatId: z.string().uuid(),
  question: z.string().min(1).max(4000),
  documentIds: z.array(z.string().uuid()).optional(),
});

export interface AskResult {
  answer: string;
  citations: Array<{ document_id: string; filename: string; page_number: number | null; chunk_index: number; snippet: string }>;
  userMessageId: string;
  assistantMessageId: string;
}

// Retrieve top chunks, call the LLM with grounded context, persist messages.
export const askQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AskSchema.parse(data))
  .handler(async ({ data, context }): Promise<AskResult> => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify chat ownership
    const { data: chat } = await supabase.from("chats").select("id, user_id, title").eq("id", data.chatId).maybeSingle();
    if (!chat || chat.user_id !== userId) throw new Error("Chat not found");

    // Save user message
    const { data: userMsg, error: umErr } = await supabase
      .from("messages")
      .insert({ chat_id: data.chatId, user_id: userId, role: "user", content: data.question })
      .select("id").single();
    if (umErr) throw umErr;

    // Get user settings (model, top_k, temperature)
    const { data: settings } = await supabase
      .from("user_settings").select("model_name, top_k, temperature").eq("user_id", userId).maybeSingle();
    const model = settings?.model_name || "google/gemini-3-flash-preview";
    const topK = settings?.top_k ?? 5;

    // Embed the question
    const { embedTexts } = await import("./ai-gateway.server");
    const [queryEmbedding] = await embedTexts(apiKey, [data.question]);

    // Retrieve relevant chunks
    const { data: matches, error: matchErr } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding as unknown as string,
      match_user_id: userId,
      match_document_ids: data.documentIds ?? null,
      match_count: topK,
    });
    if (matchErr) throw matchErr;

    const contextText = (matches ?? [])
      .map((m: any, i: number) => `[Source ${i + 1}] ${m.filename} (page ${m.page_number ?? "?"}):\n${m.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are DocMind, an assistant that answers ONLY using the provided document context.
Rules:
- If the answer is not in the context, say: "I couldn't find that in your documents." Do NOT guess.
- When you use a passage, cite it inline like [Source 1], [Source 2], matching the labels you were given.
- Be concise. Use markdown for lists, code, and emphasis where helpful.`;

    const userPrompt = contextText
      ? `Context from the user's documents:\n\n${contextText}\n\nUser question: ${data.question}`
      : `The user has no relevant documents indexed yet.\n\nUser question: ${data.question}`;

    // Call Lovable AI Gateway (OpenAI-compatible chat completions)
    const llmRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "docmind-direct",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: Number(settings?.temperature ?? 0.2),
      }),
    });

    if (!llmRes.ok) {
      const txt = await llmRes.text();
      if (llmRes.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (llmRes.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI error (${llmRes.status}): ${txt.slice(0, 200)}`);
    }

    const json = (await llmRes.json()) as { choices: Array<{ message: { content: string } }> };
    const answer = json.choices?.[0]?.message?.content?.trim() || "(no response)";

    const citations = (matches ?? []).map((m: any) => ({
      document_id: m.document_id,
      filename: m.filename,
      page_number: m.page_number,
      chunk_index: m.chunk_index,
      snippet: String(m.content).slice(0, 240),
    }));

    // Save assistant message
    const { data: aiMsg, error: amErr } = await supabase
      .from("messages")
      .insert({
        chat_id: data.chatId,
        user_id: userId,
        role: "assistant",
        content: answer,
        citations: citations as any,
      })
      .select("id").single();
    if (amErr) throw amErr;

    // Auto-title chat from first message if still default
    if (chat.title === "New chat") {
      const title = data.question.length > 60 ? data.question.slice(0, 57) + "..." : data.question;
      await supabase.from("chats").update({ title }).eq("id", data.chatId);
    } else {
      await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", data.chatId);
    }

    return {
      answer,
      citations,
      userMessageId: userMsg.id,
      assistantMessageId: aiMsg.id,
    };
  });