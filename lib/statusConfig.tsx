import React from "react";

// ─── Quote Status ───────────────────────────────────────────────────────────

export const QUOTE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: "En attente", bg: "var(--warning-bg)",  color: "var(--warning)" },
    approved: { label: "Approuvé",   bg: "var(--success-bg)", color: "var(--success)" },
    rejected: { label: "Refusé",     bg: "var(--danger-bg)",  color: "var(--danger)" },
};

// ─── Reservation Status ─────────────────────────────────────────────────────

export const RESERVATION_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    scheduled: { label: "Planifié", bg: "var(--warning-bg)",  color: "var(--warning)" },
    attended:  { label: "Venu",     bg: "var(--success-bg)", color: "var(--success)" },
    no_show:   { label: "No Show",  bg: "var(--danger-bg)",  color: "var(--danger)" },
};

// ─── StatusBadge Component ───────────────────────────────────────────────────

interface StatusBadgeProps {
    status: string;
    config: Record<string, { label: string; bg: string; color: string }>;
    size?: "sm" | "md";
}

export function StatusBadge({ status, config, size = "md" }: StatusBadgeProps) {
    const s = config[status] ?? { label: status, bg: "var(--surface-hi)", color: "var(--text-muted)" };
    const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
    return (
        <span
            className={`inline-flex items-center gap-1.5 ${px} rounded-full font-medium`}
            style={{
                background: s.bg,
                color: s.color,
                fontFamily: "var(--font-mono), monospace",
                letterSpacing: "0.04em",
            }}
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
        </span>
    );
}
