export type CatalogType = "services" | "people" | "products";

export type FeatureKey = "calendar" | "reservations" | "quotes" | "analytics" | "catalog" | "team" | "projects" | "reviews";

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
export const ALL_FEATURES: FeatureKey[] = ["calendar", "reservations", "quotes", "analytics", "catalog", "team", "projects", "reviews"];
