import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Consistent hero block reused across every marketing page — not just the home page. */
export function PageHero({ eyebrow, title, description, children }: Props) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      {eyebrow && (
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      )}
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {description && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg text-balance">{description}</p>
      )}
      {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </section>
  );
}
