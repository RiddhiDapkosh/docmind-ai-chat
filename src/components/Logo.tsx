import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <div className="size-6 rounded-sm bg-primary relative overflow-hidden">
        <div className="absolute inset-1 border-2 border-primary-foreground/40 rounded-[2px]" />
      </div>
      <span className="font-bold tracking-tight text-lg text-foreground">DocMind</span>
    </Link>
  );
}