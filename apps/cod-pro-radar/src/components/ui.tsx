import { useEffect, type ReactNode } from "react";
import type { Status } from "../types";
import { IS_ESTIMATE, STATUS_EMOJI, STATUS_SHORT } from "../lib/status";
import { percent } from "../lib/format";

export function Avatar({ url, name, live, size = 44 }: { url: string | null; name: string; live: boolean; size?: number }) {
  return (
    <div className={`avatar ${live ? "avatar--live" : ""}`} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" draggable={false} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
    </div>
  );
}

export function StatusBadge({
  status,
  confidence,
  showConfidence,
  compact,
}: {
  status: Status;
  confidence?: number;
  showConfidence?: boolean;
  compact?: boolean;
}) {
  const estimate = IS_ESTIMATE[status] && status !== "UNKNOWN";
  return (
    <span className={`badge badge--${status.toLowerCase()}`} title={STATUS_SHORT[status]}>
      <span className="badge__dot" aria-hidden>{STATUS_EMOJI[status]}</span>
      {!compact && <span>{STATUS_SHORT[status]}</span>}
      {estimate && showConfidence && confidence != null && (
        <span className="badge__conf">{percent(confidence)}</span>
      )}
    </span>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const level = pct >= 75 ? "high" : pct >= 55 ? "mid" : "low";
  return (
    <div className="meter" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`meter__fill meter__fill--${level}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle ${disabled ? "toggle--disabled" : ""}`}>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {description && <span className="toggle__desc">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden>
        <span className="toggle__thumb" />
      </span>
    </label>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal aria-label={title}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">✕</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
