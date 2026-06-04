"use client";

import type { ReactNode } from "react";
import { useInView } from "@/components/ui/use-in-view";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  /** 子元素依次入场（用于卡片网格） */
  stagger?: boolean;
};

export function ScrollReveal({
  children,
  className = "",
  as: Tag = "div",
  stagger = false,
}: Props) {
  const { ref, visible } = useInView<HTMLElement>({
    threshold: 0.1,
    rootMargin: "0px 0px -6% 0px",
  });

  return (
    <Tag
      ref={ref as never}
      className={[
        stagger ? "scroll-reveal-stagger" : "scroll-reveal",
        visible ? "is-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
