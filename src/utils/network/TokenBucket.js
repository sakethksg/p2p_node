class TokenBucket {
    constructor(capacity, refillRate, refillInterval = 1000) {
        this.capacity = capacity; // Maximum number of tokens
        this.tokens = capacity; // Current number of tokens
        this.refillRate = refillRate; // Tokens to add per interval
        this.refillInterval = refillInterval; // Interval in milliseconds
        this.lastRefillTime = Date.now();
        this.isRefilling = false;
    }

    async getToken(count = 1) {
        await this.refill();
        
        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }
        return false;
    }

    async refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefillTime;
        
        if (timePassed >= this.refillInterval) {
            const tokensToAdd = Math.floor((timePassed / this.refillInterval) * this.refillRate);
            this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
            this.lastRefillTime = now;
        }
    }

    getCurrentTokens() {
        return this.tokens;
    }

    getCapacity() {
        return this.capacity;
    }
}

export default TokenBucket; 