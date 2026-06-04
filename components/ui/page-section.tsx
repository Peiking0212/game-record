import type { ReactNode } from "react";

type PageSectionProps = {
  title?: string;
  alt?: boolean;
  id?: string;
  className?: string;
  scrollMt?: boolean;
  children: ReactNode;
};

export function PageSection({
  title,
  alt = false,
  id,
  className = "",
  scrollMt = false,
  children,
}: PageSectionProps) {
  return (
    <section
      id={id}
      className={[
        "py-16",
        alt ? "section-game-alt" : "section-game",
        scrollMt ? "scroll-mt-24" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="container mx-auto px-4">
        {title ? (
          <h2 className="page-section-title text-3xl font-bold text-center mb-12">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </section>
  );
}
