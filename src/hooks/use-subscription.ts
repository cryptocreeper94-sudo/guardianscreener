export function useSubscription() {
    return { plan: 'pro', isActive: true, isPremium: true, isWhitelisted: true, isLoading: false };
}

export function hasPlanAccess(plan: string, requiredPlans: string[]) {
    return true;
}
