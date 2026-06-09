"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type NavItem = { id: string; label: string; badge?: string };
export type NavSection = { title: string; items: NavItem[] };

export function MethodBadge({ method }: { method: "GET" | "POST" | "TOOL" }) {
  const color =
    method === "GET"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : method === "POST"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-violet-50 text-violet-700 ring-violet-200";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${color}`}
    >
      {method}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12.5px] text-zinc-800">
      {children}
    </code>
  );
}

export function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-[12.5px] leading-relaxed text-zinc-100">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

export function Section({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-zinc-200 pb-12 pt-2">
      {children}
    </section>
  );
}

export function DocsShell({
  nav,
  eyebrow,
  title,
  intro,
  children,
}: {
  nav: NavSection[];
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const ids = nav.flatMap((s) => s.items.map((i) => i.id));
  const [active, setActive] = useState<string>(ids[0] ?? "");
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handler = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - 120 <= 0) current = id;
      }
      if (current) setActive(current);
    };
    handler();
    const mainEl = mainRef.current;
    window.addEventListener("scroll", handler, { passive: true });
    mainEl?.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      mainEl?.removeEventListener("scroll", handler);
    };
  }, [ids]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 80;

    const findScroller = (node: HTMLElement | null): HTMLElement | null => {
      let n: HTMLElement | null = node?.parentElement ?? null;
      while (n && n !== document.body) {
        const cs = window.getComputedStyle(n);
        const oy = cs.overflowY;
        if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) {
          return n;
        }
        n = n.parentElement;
      }
      return null;
    };

    const scroller = findScroller(el);
    if (scroller) {
      const containerRect = scroller.getBoundingClientRect();
      const top =
        scroller.scrollTop + el.getBoundingClientRect().top - containerRect.top - offset;
      scroller.scrollTo({ top, behavior: "smooth" });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setActive(id);
  }, []);

  return (
    <div className="flex flex-col md:flex-row">
      <aside className="border-b border-zinc-200 bg-white px-5 py-6 md:sticky md:top-14 md:h-[calc(100dvh-56px)] md:w-72 md:flex-none md:overflow-y-auto md:border-b-0 md:border-r md:px-6 md:py-8">
        <nav className="space-y-6">
          <ul className="space-y-5">
            {nav.map((section) => (
              <li key={section.title}>
                <p className="mb-1.5 text-[12px] font-semibold text-zinc-900">
                  {section.title}
                </p>
                <ul className="space-y-0.5 border-l border-zinc-200">
                  {section.items.map((item) => {
                    const isActive = active === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(item.id)}
                          className={`-ml-px flex w-full items-center gap-2 border-l py-1 pl-3 text-left text-[13px] transition-colors ${
                            isActive
                              ? "border-zinc-900 font-medium text-zinc-900"
                              : "border-transparent text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badge ? (
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-400">
                              {item.badge}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main ref={mainRef} className="flex-1 bg-white">
        <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10 md:py-14">
          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              {title}
            </h1>
            <div className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-zinc-600">
              {intro}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
