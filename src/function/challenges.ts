const pendingChallenges = new Map<string, { challenger: string, expires: number }>();

export const challengeManager = {
    create(challenger: string, chatId: string) {
        if (this.hasPending(challenger)) return false;
        pendingChallenges.set(chatId, { 
            challenger, 
            expires: Date.now() + 30_000 
        });
        return true;
    },

    hasPending(challenger: string) {
        return [...pendingChallenges.values()].some(c => c.challenger === challenger);
    },

    accept(chatId: string) {
        const challenge = pendingChallenges.get(chatId);
        if (!challenge || Date.now() > challenge.expires) return false;
        pendingChallenges.delete(chatId);
        return true;
    }
};