"use client";

import { useUserProfile } from "./useUserProfile";
import { planIncludes, getPlan, type PlanId } from "./plans";

export function useFeatureAccess(requiredPlan: PlanId) {
    const { profile } = useUserProfile();
    const userPlan: PlanId = profile?.plan ?? "starter";
    const hasAccess = true; // TODO: re-enable when plan column is in DB
    return {
        hasAccess,
        userPlan,
        userPlanInfo: getPlan(userPlan),
        requiredPlanInfo: getPlan(requiredPlan),
    };
}
