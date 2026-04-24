import React from "react";

// ─── Quote Status ───────────────────────────────────────────────────────────

export const QUOTE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: "En attente", bg: "rgba(255,199,69,0.1)",  color: "#FFC745" },
    approved: { label: "Approuvé",   bg: "rgba(34,197,94,0.1)",   color: "#22c55e" },
    rejected: { label: "Refusé",     bg: "rgba(239,68,68,0.1)",   color: "#ef4444" },
};

// ─── Reservation Status ─────────────────────────────────────────────────────

export const RESERVATION_STATUS: Record<string, { label: string; bg: string; color: string }> = {
    scheduled: { label: "Planifié", bg: "rgba(255,199,69,0.1)",  color: "#FFC745" },
    attended:  { label: "Venu",     bg: "rgba(0,255,145,0.1)",   color: "#00ff91" },
    no_show:   { label: "No Show",  bg: "rgba(239,68,68,0.1)",   color: "#f87171" },
};

// ─── StatusBadge Component ───────────────────────────────────────────────────

interface StatusBadgeProps {
    status: string;
    config: Record<string, { label: string; bg: string; color: string }>;
    size?: "sm" | "md";
}

export function StatusBadge({ status, config, size = "md" }: StatusBadgeProps) {
    const s = config[status] ?? { label: status, bg: "rgba(113,113,122,0.1)", color: "#71717a" };
    const px = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
    return (
        <span
            className={`inline-flex items-center gap-1 ${px} rounded-full font-medium`}
            style={{ background: s.bg, color: s.color }}
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
        </span>
    );
}
