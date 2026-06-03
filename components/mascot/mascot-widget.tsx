"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useToast } from "@/components/ui/toast";
import { registerMascotSpeak } from "@/lib/mascot-notify";
import {
  getMascotImage,
  getMascotQuotes,
  isMascotEnabled,
  MASCOT_DEFAULT_IMAGE,
  pickRandomQuote,
  setMascotEnabled,
  setMascotImage,
} from "@/lib/mascot-storage";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function MascotWidget({ enabled, onEnabledChange }: Props) {
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [speech, setSpeech] = useState("");
  const [speechVisible, setSpeechVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState(MASCOT_DEFAULT_IMAGE);
  const [quotes, setQuotes] = useState<string[]>([]);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    moved: false,
  });

  useEffect(() => {
    setQuotes(getMascotQuotes());
    const stored = getMascotImage();
    if (stored) setImageSrc(stored);
  }, []);

  const showSpeech = useCallback((text: string) => {
    if (!text) return false;
    setSpeech(text);
    setSpeechVisible(true);
    return true;
  }, []);

  useEffect(() => {
    registerMascotSpeak((text) => {
      if (!enabled) return false;
      return showSpeech(text);
    });
    return () => registerMascotSpeak(null);
  }, [enabled, showSpeech]);

  useEffect(() => {
    if (!enabled || quotes.length === 0) return;
    const greet = window.setTimeout(() => {
      showSpeech(pickRandomQuote(quotes));
    }, 2000);
    const interval = window.setInterval(() => {
      showSpeech(pickRandomQuote(quotes));
    }, 30_000);
    return () => {
      window.clearTimeout(greet);
      window.clearInterval(interval);
    };
  }, [enabled, quotes, showSpeech]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.closest('input[type="file"]')
    ) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    el.classList.add("dragging");
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    el.style.left = `${dragRef.current.startLeft + dx}px`;
    el.style.top = `${dragRef.current.startTop + dy}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    containerRef.current?.classList.remove("dragging");
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onCharacterClick = () => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    if (quotes.length) showSpeech(pickRandomQuote(quotes));
  };

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let compressed = String(reader.result || "");
      const save = (dataUrl: string) => {
        try {
          setMascotImage(dataUrl);
          setImageSrc(dataUrl);
          showToast("看板娘新衣服换上啦！", "success");
        } catch {
          showToast("图片太大，无法保存", "error");
        }
      };
      if (compressed.length <= 500_000) {
        save(compressed);
        return;
      }
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, (500_000 / compressed.length) * 1.5);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          save(compressed);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        save(canvas.toDataURL("image/png"));
      };
      img.src = compressed;
    };
    reader.readAsDataURL(file);
  };

  if (!enabled) {
    return (
      <button
        type="button"
        className="mascot-toggle-btn"
        title="显示看板娘"
        aria-label="显示看板娘"
        data-testid="mascot-show-btn"
        onClick={() => {
          setMascotEnabled(true);
          onEnabledChange(true);
        }}
      >
        🎭
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="mascot-toggle-btn"
        title="隐藏看板娘"
        aria-label="隐藏看板娘"
        data-testid="mascot-hide-btn"
        onClick={() => {
          setMascotEnabled(false);
          onEnabledChange(false);
        }}
      >
        ✕
      </button>
      <div
        ref={containerRef}
        id="mascot-container"
        className="mascot-container"
        data-testid="mascot-container"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          id="mascot-speech"
          className={`mascot-speech${speechVisible ? " show fade" : ""}`}
          data-testid="mascot-speech"
          role="status"
          aria-live="polite"
        >
          {speech}
        </div>
        <div
          className="mascot-character"
          onClick={onCharacterClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onCharacterClick();
          }}
          role="button"
          tabIndex={0}
          aria-label="看板娘，点击随机台词"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="看板娘" id="mascot-img" />
        </div>
        <button
          type="button"
          className="mascot-upload-btn"
          id="mascot-upload-trigger"
          onClick={() =>
            document.getElementById("mascot-file-input")?.click()
          }
        >
          换装
        </button>
        <input
          id="mascot-file-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            onUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );
}
