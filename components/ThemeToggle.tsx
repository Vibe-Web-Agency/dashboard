"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const stored = localStorage.getItem("theme") as "dark" | "light" | null;
        const initial = stored ?? "dark";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const toggle = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("theme", next);
        document.documentElement.setAttribute("data-theme", next);
    };

    return (
        <button
            onClick={toggle}
            title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-muted)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
            {theme === "dark"
                ? <Sun className="w-3.5 h-3.5" />
                : <Moon className="w-3.5 h-3.5" />}
        </button>
    );
}
