"use client";

import { useState } from "react";
import { PageHead } from "../_components/ui";
import { SchedulePlanner } from "./_components/SchedulePlanner";
import { TeamList } from "./_components/TeamList";

// Équipe (module `team`) : le planning de la semaine et la liste des personnes (CLAUDE.md 9.5 et 9.12).

const TABS = [{ id: "planning", label: "Planning" }, { id: "people", label: "Équipe" }] as const;
type Tab = (typeof TABS)[number]["id"];

export default function TeamPage() {
    const [tab, setTab] = useState<Tab>("planning");
    return (
        <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full">
            <PageHead title="Équipe" sub="Planning de la semaine et personnes de l'établissement">
                <div role="tablist" className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {TABS.map((t) => (
                        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="rounded-md px-3 py-1.5 text-sm"
                            style={tab === t.id ? { background: "var(--accent)", color: "#0E0D0B" } : { color: "var(--text-muted)" }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </PageHead>
            {tab === "planning" ? <SchedulePlanner /> : <TeamList />}
        </div>
    );
}
