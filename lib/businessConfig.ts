export type CatalogType = "services" | "people" | "products";

export type FeatureKey = "calendar" | "reservations" | "quotes" | "analytics" | "stats" | "catalog" | "team" | "projects" | "reviews" | "clients" | "blog" | "orders";

export interface BusinessType {
    id: string;
    slug: string;
    label: string;
    catalog: CatalogType;
    catalog_label: string;
    features: FeatureKey[];
}

// Fallback si business_type_id non défini
export const DEFAULT_CATALOG: CatalogType = "services";
export const DEFAULT_CATALOG_LABEL = "Services";
export const ALL_FEATURES: FeatureKey[] = ["calendar", "reservations", "quotes", "analytics", "stats", "catalog", "team", "projects", "reviews", "clients", "blog", "orders"];

// ─── UI config par type de business ──────────────────────────────────────────

export interface BusinessTypeUI {
    reservationLabel: string;   // Libellé du module réservations (ex: "RDV", "Réservations")
    showGuests: boolean;        // Afficher le champ couverts/participants
    guestsLabel: string;        // Libellé du champ guests (ex: "Couverts", "Participants")
    homeChartLabel: string;     // Libellé dans les graphiques du dashboard
}

export const BUSINESS_TYPE_UI: Record<string, BusinessTypeUI> = {
    restaurant: {
        reservationLabel: "Réservations",
        showGuests: true,
        guestsLabel: "Couverts",
        homeChartLabel: "Réservations",
    },
    barbershop: {
        reservationLabel: "RDV",
        showGuests: false,
        guestsLabel: "",
        homeChartLabel: "RDV",
    },
    agence_comediens: {
        reservationLabel: "Réservations",
        showGuests: false,
        guestsLabel: "",
        homeChartLabel: "Réservations",
    },
};

export function getBusinessTypeUI(slug?: string | null): BusinessTypeUI {
    return BUSINESS_TYPE_UI[slug ?? ""] ?? {
        reservationLabel: "Réservations",
        showGuests: false,
        guestsLabel: "Couverts",
        homeChartLabel: "Réservations",
    };
}
