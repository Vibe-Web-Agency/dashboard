export type PlanId = "starter" | "pro" | "business";

export interface Plan {
    id: PlanId;
    label: string;
    price: number;
    description: string;
    badge: string;
}

export const PLANS: Plan[] = [
    { id: "starter", label: "Essentiel", price: 49, description: "Pour démarrer votre présence en ligne", badge: "" },
    { id: "pro", label: "Pro", price: 129, description: "Pour développer votre activité", badge: "Pro" },
    { id: "business", label: "Business", price: 349, description: "La suite complète pour les leaders", badge: "Business" },
];

const PLAN_RANK: Record<PlanId, number> = { starter: 0, pro: 1, business: 2 };

export function planIncludes(userPlan: PlanId, requiredPlan: PlanId): boolean {
    return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function getPlan(id: PlanId): Plan {
    return PLANS.find(p => p.id === id) ?? PLANS[0];
}
