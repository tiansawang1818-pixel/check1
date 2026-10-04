import { type ReactNode, useState } from "react";
import { ArrowUpRight, Check, Copy, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../lib/context";
export function Heading(
  { eyebrow, title, description, children }: {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: ReactNode;
  },
) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className={`badge ${String(children).toLowerCase()}`}>
      {({
        ACTIVE: "พร้อมใช้งาน",
        DRAFT: "ฉบับร่าง",
        DISABLED: "ปิดใช้งาน",
        BLOCKED: "ถูกระงับ",
        SUCCESS: "สำเร็จ",
        RUNTIME_ERROR: "ทำงานไม่สำเร็จ",
        VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง",
        RATE_LIMITED: "ใช้งานเกินกำหนด",
        TIMEOUT: "หมดเวลา",
        PENDING: "รอตรวจสอบ",
      } as Record<string, string>)[String(children)] ||
        String(children).replaceAll("_", " ")}
    </span>
  );
}
export function Loading() {
  return (
    <div className="empty" role="status">
      <span className="runtime-loader" aria-hidden="true"><i /><i /><i /></span>กำลังโหลดข้อมูล…
    </div>
  );
}
export function ErrorBox(
  { error, retry }: { error: string; retry?: () => void },
) {
  return (
    <div className="error-box" role="alert">
      <p>{error}</p>
      {retry && (
        <button className="secondary" onClick={retry}>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
export function Empty(
  { title, children }: { title: string; children?: ReactNode },
) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function CopyButton(
  { value, label = "Copy" }: { value: string; label?: string },
) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="secondary small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast("Clipboard unavailable. Select and copy the text.", true);
        }
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
      {copied ? "Copied" : label}
    </button>
  );
}
export function Code({ children }: { children: string }) {
  return (
    <div className="code">
      <CopyButton value={children} />
      <pre>{children}</pre>
    </div>
  );
}
export function Metric(
  { label, value, note }: { label: string; value: ReactNode; note?: string },
) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function Panel(
  { title, children, action }: {
    title?: string;
    children: ReactNode;
    action?: ReactNode;
  },
) {
  return (
    <section className="panel">
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function MoreLink(
  { to, children }: { to: string; children: ReactNode },
) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
export function Json({ value }: { value: unknown }) {
  return <pre className="json">{JSON.stringify(value,null,2)}</pre>;
}
export function Pagination(
  { page, setPage, count }: {
    page: number;
    setPage: (p: number) => void;
    count: number;
  },
) {
  return (
    <div className="pagination">
      <button
        className="secondary"
        disabled={!page}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>Page {page + 1}</span>
      <button
        className="secondary"
        disabled={count < 50}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
export const formatDate = (value: string) => new Date(value).toLocaleString();
