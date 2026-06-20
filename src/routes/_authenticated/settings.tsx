import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — DocMind AI" }] }),
  component: SettingsPage,
});

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (default, fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (most capable)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (premium)" },
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { ...data, email: u.user.email };
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").maybeSingle();
      return data;
    },
  });

  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [temperature, setTemperature] = useState(0.2);
  const [topK, setTopK] = useState(5);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (settings) {
      setModel(settings.model_name);
      setTemperature(Number(settings.temperature));
      setTopK(settings.top_k);
    }
    if (profile) setFullName(profile.full_name ?? "");
  }, [settings, profile]);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [s, p] = await Promise.all([
      supabase.from("user_settings").upsert({
        user_id: u.user.id,
        model_name: model,
        temperature,
        top_k: topK,
      }),
      supabase.from("profiles").update({ full_name: fullName }).eq("id", u.user.id),
    ]);
    if (s.error || p.error) return toast.error("Failed to save");
    toast.success("Settings saved");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["user_settings"] });
  }

  return (
    <AppShell title="Settings">
      <div className="p-6 md:p-8 max-w-2xl space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Profile</h2>
          <div className="space-y-3 rounded-xl border border-border bg-card/30 p-5">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">AI</h2>
          <div className="space-y-5 rounded-xl border border-border bg-card/30 p-5">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="font-mono text-xs text-muted-foreground">{temperature.toFixed(2)}</span>
              </div>
              <Slider value={[temperature]} onValueChange={(v) => setTemperature(v[0])} min={0} max={1} step={0.05} />
              <p className="text-xs text-muted-foreground">Lower = more grounded. We recommend ≤ 0.3 for RAG.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Top-K retrieval</Label>
                <span className="font-mono text-xs text-muted-foreground">{topK}</span>
              </div>
              <Slider value={[topK]} onValueChange={(v) => setTopK(v[0])} min={1} max={15} step={1} />
              <p className="text-xs text-muted-foreground">Number of document chunks passed as context.</p>
            </div>
          </div>
        </section>

        <Button onClick={save} className="w-full sm:w-auto">Save settings</Button>
      </div>
    </AppShell>
  );
}