"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";
const CHANGE = "vwa-theme-change";

// Le thème vit dans le stockage du navigateur : le composant s'y abonne au lieu d'en garder une copie.
function subscribe(onChange: () => void) {
    window.addEventListener(CHANGE, onChange);
    window.addEventListener("storage", onChange);
    return () => { window.removeEventListener(CHANGE, onChange); window.removeEventListener("storage", onChange); };
}
const readTheme = (): Theme => (localStorage.getItem("theme") === "light" ? "light" : "dark");

export default function ThemeToggle() {
    // Côté serveur, et au premier rendu, le thème sombre par défaut.
    const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "dark");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const toggle = () => {
        localStorage.setItem("theme", theme === "dark" ? "light" : "dark");
        window.dispatchEvent(new Event(CHANGE));
    };

    return (
        <button
            onClick={toggle}
            title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
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
