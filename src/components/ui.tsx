import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Inbox, X, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const CHART_COLORS = [
  "#517a59",
  "#d3a661",
  "#8c9ecd",
  "#b6c98c",
  "#d38b7d",
  "#a69bb7",
];
export function PageHeader({
  eyebrow = "YOUR EVERYDAY, A LITTLE BETTER",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
export function Card({
  children,
  className = "",
  title,
  description,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="section-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function StatCard({
  label,
  value,
  unit,
  icon: Icon = ArrowUpRight,
  tone = "green",
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: LucideIcon;
  tone?: "green" | "blue" | "orange" | "purple";
  hint?: string;
}) {
  return (
    <section className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={17} strokeWidth={1.7} />
        </span>
      </div>
      <div
        className={`stat-value ${typeof value === "string" && value.length >= 7 ? "compact-value" : ""}`}
      >
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </section>
  );
}
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={25} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) ?? [],
      );
    const firstInput = ref.current?.querySelector<HTMLElement>(
      "input, select, textarea",
    );
    (firstInput ?? focusable()[0])?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="btn icon ghost"
            onClick={onClose}
            aria-label="关闭弹窗"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-content">
        <span className="confirm-icon">
          <AlertTriangle size={23} />
        </span>
        <p>{description}</p>
      </div>
      <div className="form-actions">
        <button className="btn secondary" onClick={onClose}>
          取消
        </button>
        <button className="btn danger" onClick={onConfirm}>
          确认
        </button>
      </div>
    </Modal>
  );
}
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly {
    color?: string;
    name?: string | number;
    value?: string | number | readonly (string | number)[];
  }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item, i) => (
        <div key={i}>
          <i style={{ background: item.color }} />
          {item.name}
          <b>
            {typeof item.value === "number"
              ? Number(item.value.toFixed(2)).toLocaleString("zh-CN")
              : item.value}
          </b>
        </div>
      ))}
    </div>
  );
}
