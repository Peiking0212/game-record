"use client";

import { useEffect, useState, type ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  size?: "compact" | "default";
};

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  size = "compact",
}: PageHeroProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const pad = size === "default" ? "py-20 md:py-28" : "py-12 md:py-16";

  return (
    <section className={`hero-game ${pad} flex items-center`} data-hero>
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow hero-glow--a" aria-hidden />
      <div className="hero-glow hero-glow--b" aria-hidden />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className={`hero-eyebrow font-mono text-sm mb-4 ${ready ? "is-visible" : ""}`}
          >
            {eyebrow}
          </p>
          <h1
            className={`hero-title text-4xl md:text-5xl mb-5 ${ready ? "is-visible" : ""}`}
          >
            <span className="hero-title-line block">{title}</span>
          </h1>
          {description ? (
            <div
              className={`hero-desc text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed ${ready ? "is-visible" : ""}`}
            >
              {description}
            </div>
          ) : null}
          {children ? (
            <div
              className={`hero-actions flex flex-wrap justify-center gap-4 ${ready ? "is-visible" : ""}`}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
