class AIMD {
    constructor(initialRate = 1000, minRate = 100, maxRate = 10000) {
        this.currentRate = initialRate; // Current sending rate in bytes per second
        this.minRate = minRate; // Minimum sending rate
        this.maxRate = maxRate; // Maximum sending rate
        this.increaseFactor = 100; // Bytes to increase per successful transmission
        this.decreaseFactor = 0.5; // Factor to multiply rate by when congestion is detected
        this.lastUpdateTime = Date.now();
        this.successfulTransmissions = 0;
        this.failedTransmissions = 0;
    }

    // Called when a transmission is successful
    onSuccess() {
        this.successfulTransmissions++;
        this.currentRate = Math.min(
            this.maxRate,
            this.currentRate + this.increaseFactor
        );
        this.updateStats();
    }

    // Called when congestion is detected
    onCongestion() {
        this.failedTransmissions++;
        this.currentRate = Math.max(
            this.minRate,
            Math.floor(this.currentRate * this.decreaseFactor)
        );
        this.updateStats();
    }

    // Get the current sending rate
    getCurrentRate() {
        return this.currentRate;
    }

    // Get congestion statistics
    getStats() {
        return {
            currentRate: this.currentRate,
            successfulTransmissions: this.successfulTransmissions,
            failedTransmissions: this.failedTransmissions,
            congestionRatio: this.failedTransmissions / 
                (this.successfulTransmissions + this.failedTransmissions) || 0
        };
    }

    updateStats() {
        const now = Date.now();
        const timeDiff = now - this.lastUpdateTime;
        
        // Reset counters every second
        if (timeDiff >= 1000) {
            this.successfulTransmissions = 0;
            this.failedTransmissions = 0;
            this.lastUpdateTime = now;
        }
    }
}

export default AIMD; 