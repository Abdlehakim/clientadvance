import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PageShell({
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <section className="page">
      <header className="page__header">
        <div className="page__eyebrow">{"Espace propriétaire"}</div>
        <h1 className="page__title">{title}</h1>
        <p className="page__description">{description}</p>
      </header>

      {children}
    </section>
  );
}
