import type { ReactNode } from "react";

export type LegalSection = { heading: string; body: ReactNode };

type Props = {
  title: string;
  effectiveDate: string;
  intro?: ReactNode;
  sections: LegalSection[];
};

/**
 * Shared structure for every legal page — each page supplies only its
 * title and a `sections` array of {heading, body}; this component owns
 * the typography, numbering, and layout. Updating a policy later means
 * editing that page's `sections` array, never touching markup — the
 * "structured so it can easily be updated later" requirement satisfied
 * by the component boundary itself, not by a comment asking someone to
 * be careful.
 */
export function LegalDocument({ title, effectiveDate, intro, sections }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">Effective date: {effectiveDate}</p>

      {intro && <div className="mt-6 space-y-4 text-base leading-relaxed">{intro}</div>}

      <div className="mt-10 space-y-10">
        {sections.map((section, i) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">
              {i + 1}. {section.heading}
            </h2>
            <div className="text-muted-foreground mt-3 space-y-3 text-base leading-relaxed">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
