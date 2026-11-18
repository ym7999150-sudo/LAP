"use client";

export function Page({ title, subtitle, actions, children, wide }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full px-4 py-6 sm:px-6 lg:py-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
      <div className="animate-in mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "", as: As = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  return <As className={`panel p-4 ${className}`}>{children}</As>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-faint">{text}</div>;
}

export function Skeleton({ rows = 3, h = "h-16" }: { rows?: number; h?: string }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`skeleton ${h}`} />
      ))}
    </div>
  );
}
