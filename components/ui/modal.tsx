"use client";

import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl";
};

const widthClass = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "lg",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal active"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-content ${widthClass[maxWidth]}`}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
        {title && (
          <h3 className="text-xl font-semibold mb-6 text-gray-800">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}