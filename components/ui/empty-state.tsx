import * as React from "react";

interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: React.ReactNode;
    compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
    return (
        <div
            className="flex flex-col items-center justify-center text-center"
            style={{ padding: compact ? "32px 20px" : "60px 20px", gap: 10 }}
        >
            {Icon && (
                <div
                    style={{
                        width: compact ? 40 : 52,
                        height: compact ? 40 : 52,
                        borderRadius: 12,
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-faint)",
                        marginBottom: 4,
                    }}
                >
                    <Icon style={{ width: compact ? 18 : 22, height: compact ? 18 : 22 }} />
                </div>
            )}
            <p style={{ fontSize: compact ? "13px" : "14px", fontWeight: 500, color: "var(--text)" }}>
                {title}
            </p>
            {description && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: 280 }}>
                    {description}
                </p>
            )}
            {action && <div style={{ marginTop: 4 }}>{action}</div>}
        </div>
    );
}
