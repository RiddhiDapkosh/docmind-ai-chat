import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowUpRight, FileText, Quote, ShieldCheck, Sparkles, Upload, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocMind AI — Chat With Your Own Documents Using AI" },
      {
        name: "description",
        content:
          "Upload PDFs, notes, books and files. Get accurate answers with source citations using Retrieval-Augmented Generation.",
      },
      { property: "og:title", content: "DocMind AI — Chat With Your Documents" },
      {
        property: "og:description",
        content: "Turn any library of documents into a queryable knowledge base. Verifiable answers, every time.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Nav />
      <Hero />
      <ChatPreview />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium px-3 py-2 hover:bg-white/5 rounded-md transition-colors">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="text-sm font-bold bg-foreground text-background px-4 py-2 rounded-md hover:bg-foreground/90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-mono mb-8 animate-reveal uppercase tracking-widest">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Now with multi-document RAG
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 animate-reveal [animation-delay:80ms] text-balance">
          Chat With Your Own <span className="text-primary">Documents</span> Using AI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-reveal [animation-delay:160ms] text-pretty">
          Upload PDFs, notes, books and files and get accurate answers with source citations — powered by retrieval-augmented generation on your private knowledge base.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-reveal [animation-delay:240ms]">
          <Link
            to="/auth"
            className="h-12 px-8 bg-primary text-primary-foreground font-bold rounded-lg hover:shadow-[0_0_30px_-5px_oklch(0.78_0.18_152/0.6)] transition-all inline-flex items-center justify-center gap-2"
          >
            Get Started <ArrowUpRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="h-12 px-8 border border-border bg-white/5 font-bold rounded-lg hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2"
          >
            <Upload className="size-4" /> Upload Documents
          </Link>
        </div>
      </div>
    </section>
  );
}

function ChatPreview() {
  return (
    <section className="px-6 max-w-6xl mx-auto">
      <div className="rounded-2xl border border-border bg-card/50 p-4 md:p-6 animate-reveal [animation-delay:320ms] shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <div className="hidden md:block space-y-4 border-r border-border pr-6">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Active library</div>
            <LibraryItem name="Operating_Systems.pdf" meta="2.4 MB · 480 pages" active />
            <LibraryItem name="DBMS_Notes.md" meta="48 KB · 12 sections" />
            <LibraryItem name="Research_Paper_RAG.pdf" meta="1.1 MB · 18 pages" />
          </div>
          <div className="flex flex-col min-h-[420px]">
            <div className="flex-1 space-y-6 pb-4">
              <div className="flex gap-3 justify-end">
                <div className="bg-secondary text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
                  Summarize how virtual memory paging works, with sources.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold flex-shrink-0">D</div>
                <div className="space-y-3 flex-1">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    Virtual memory paging divides memory into fixed-size pages. The OS maps virtual pages to physical frames via a page table, and a page fault triggers loading from disk on miss.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Citation name="Operating_Systems.pdf" page={45} />
                    <Citation name="Operating_Systems.pdf" page={47} />
                    <Citation name="DBMS_Notes.md" page={3} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-2 rounded-xl border border-border bg-background flex items-center gap-2">
              <input
                disabled
                placeholder="Ask about your documents..."
                className="flex-1 bg-transparent text-sm outline-none px-3 py-2 placeholder:text-muted-foreground"
              />
              <div className="size-8 bg-primary rounded-lg grid place-items-center text-primary-foreground">
                <ArrowUpRight className="size-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LibraryItem({ name, meta, active }: { name: string; meta: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${active ? "bg-white/5 border border-white/10" : "border border-transparent opacity-60"}`}>
      <div className="size-8 rounded bg-primary/10 grid place-items-center text-primary text-[10px] font-mono">PDF</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{name}</div>
        <div className="text-[10px] text-muted-foreground">{meta}</div>
      </div>
    </div>
  );
}

function Citation({ name, page }: { name: string; page: number }) {
  return (
    <span className="px-2 py-1 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer">
      {name} · Page {page}
    </span>
  );
}

function Features() {
  const items = [
    { num: "01", icon: Quote, title: "Verified citations", body: "Every answer links back to the exact page and paragraph in your source document. Never wonder where a claim came from." },
    { num: "02", icon: Sparkles, title: "Cross-document RAG", body: "Ask questions that span multiple files. Compare notes, find contradictions, synthesize across an entire library." },
    { num: "03", icon: ShieldCheck, title: "Private knowledge base", body: "Your documents are stored in a private vector database with row-level security. We never train models on your data." },
    { num: "04", icon: Zap, title: "Fast retrieval", body: "Vector similarity search powered by pgvector returns the most relevant chunks in milliseconds." },
    { num: "05", icon: FileText, title: "All your formats", body: "PDF, DOCX, TXT, Markdown, lecture notes, research papers, Obsidian notes — drop them in." },
    { num: "06", icon: Upload, title: "Drag and drop", body: "Upload dozens of documents at once. Watch them process in real time." },
  ];
  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">/ Features</div>
          <h2 className="text-4xl font-bold tracking-tight">A grounded answer engine for your private documents.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {items.map((f) => (
            <div key={f.num} className="bg-background p-8 space-y-4 hover:bg-card transition-colors">
              <div className="flex items-center justify-between">
                <f.icon className="size-5 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest">{f.num}</span>
              </div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Upload", b: "Drag in PDFs, DOCX, TXT, or Markdown files. We extract text, split into chunks, and embed everything." },
    { n: "02", t: "Ask", b: "Open a chat. Ask a question in natural language. We retrieve the most relevant passages from your library." },
    { n: "03", t: "Verify", b: "Every claim shows the source: filename and page. Click to jump to the original passage." },
  ];
  return (
    <section id="how" className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">/ How it works</div>
        <h2 className="text-4xl font-bold tracking-tight mb-16 max-w-xl">Three steps. No hallucinations.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="border-t border-primary/30 pt-6 space-y-3">
              <div className="font-mono text-xs text-primary">{s.n}</div>
              <h3 className="text-2xl font-bold">{s.t}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { q: "DocMind replaced three different note-search tools for my PhD research. The citations are what sold me.", a: "Maya Chen", r: "PhD candidate, MIT" },
    { q: "We loaded 400 legal briefs and our team can finally search them like they're one searchable brain.", a: "Daniel Rivera", r: "Counsel, Hexa Legal" },
    { q: "It actually says 'I don't know' when the answer isn't in my notes. Finally.", a: "Anika Patel", r: "Engineering lead" },
  ];
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">/ Loved by</div>
        <h2 className="text-4xl font-bold tracking-tight mb-16 max-w-xl">Researchers, lawyers, and engineers.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {t.map((x) => (
            <figure key={x.a} className="border border-border rounded-2xl p-6 bg-card/40 space-y-6">
              <blockquote className="text-base leading-relaxed">"{x.q}"</blockquote>
              <figcaption>
                <div className="font-semibold text-sm">{x.a}</div>
                <div className="text-xs text-muted-foreground">{x.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Personal", price: "$0", per: "/mo", feats: ["5 documents", "50 messages / month", "Basic citations"], cta: "Start free" },
    { name: "Pro", price: "$20", per: "/mo", feats: ["Unlimited documents", "Unlimited messages", "Cross-document RAG", "Priority models"], cta: "Start 7-day trial", featured: true },
    { name: "Enterprise", price: "Custom", per: "", feats: ["SSO + SAML", "On-prem deployment", "Dedicated support", "SOC2"], cta: "Contact sales" },
  ];
  return (
    <section id="pricing" className="py-32 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">/ Pricing</div>
          <h2 className="text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing.</h2>
          <p className="text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`p-8 rounded-2xl border ${t.featured ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-white/[0.02]"}`}
            >
              <div className={`text-xs font-mono mb-4 uppercase tracking-widest ${t.featured ? "text-primary" : "text-muted-foreground"}`}>{t.name}</div>
              <div className="text-4xl font-bold mb-6">
                {t.price}
                <span className="text-base font-normal text-muted-foreground">{t.per}</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {t.feats.map((f) => (
                  <li key={f} className="flex gap-2 text-foreground/80">
                    <span className="text-primary">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`block text-center py-3 rounded-lg font-bold transition-colors ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-white/5"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "What file types can I upload?", a: "PDF, DOCX, TXT, and Markdown. Engineering books, research papers, lecture notes, Obsidian vaults — all supported." },
    { q: "How accurate are the answers?", a: "DocMind only answers from your documents. Every claim shows the source page. If the answer isn't in your library, the AI says so instead of guessing." },
    { q: "Is my data private?", a: "Yes. Files are stored in your own private vector store with row-level security. Documents are never used to train public models." },
    { q: "Which AI models power DocMind?", a: "We use Google Gemini for chat and embeddings by default, with optional support for GPT-4o and other models on Pro." },
  ];
  return (
    <section id="faq" className="py-24 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">/ FAQ</div>
        <h2 className="text-4xl font-bold tracking-tight mb-12">Common questions.</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="group border border-border rounded-xl p-6 bg-card/30 [&_summary]:list-none">
              <summary className="flex items-center justify-between cursor-pointer font-semibold">
                {f.q}
                <span className="text-primary text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <Logo />
        <div className="flex gap-8 text-xs font-mono text-muted-foreground uppercase tracking-widest">
          <a href="#" className="hover:text-primary transition-colors">Security</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">© 2026 DocMind AI</div>
      </div>
    </footer>
  );
}
