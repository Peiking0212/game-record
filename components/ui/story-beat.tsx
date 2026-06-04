"use client";

import type { CSSProperties, ReactNode } from "react";
import { useInView } from "@/components/ui/use-in-view";

/** save=存档槽 · quest=背包整理条 · hud=HUD 提示框 */
export type StoryVariant = "save" | "quest" | "hud";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: StoryVariant;
  /** 章节/槽位编号，如 01、A-1 */
  chapter?: string;
  /** 顶栏小标签（mono） */
  tag?: string;
  delay?: number;
  onScroll?: boolean;
  play?: boolean;
  /** 入场后轻微漂移（存档条悬浮感，非聊天气泡） */
  idleDrift?: boolean;
  style?: CSSProperties;
};

export function StoryBeat({
  children,
  className = "",
  variant = "save",
  chapter,
  tag,
  delay = 0,
  onScroll = false,
  play = true,
  idleDrift = false,
  style,
}: Props) {
  const { ref, visible } = useInView<HTMLDivElement>({
    threshold: 0.08,
    rootMargin: "0px 0px -5% 0px",
  });
  const show = onScroll ? visible : play;

  return (
    <article
      ref={onScroll ? ref : undefined}
      className={[
        "story-beat",
        `story-beat--${variant}`,
        idleDrift ? "story-beat--drift" : "",
        show ? "is-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, ["--beat-delay" as string]: `${delay}ms` }}
    >
      {(tag || chapter) && (
        <header className="story-beat__meta">
          {chapter && (
            <span className="story-beat__chapter font-mono" aria-hidden>
              {chapter}
            </span>
          )}
          {tag && <span className="story-beat__tag font-mono">{tag}</span>}
        </header>
      )}
      <div className="story-beat__body">{children}</div>
    </article>
  );
}
