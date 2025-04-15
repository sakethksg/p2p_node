import TokenBucket from './TokenBucket';
import AIMD from './AIMD';

class QoSManager {
    constructor() {
        this.priorityLevels = {
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1
        };

        this.transferQueues = {
            [this.priorityLevels.HIGH]: [],
            [this.priorityLevels.MEDIUM]: [],
            [this.priorityLevels.LOW]: []
        };

        // Initialize token buckets for each priority level
        this.tokenBuckets = {
            [this.priorityLevels.HIGH]: new TokenBucket(1000, 100, 1000),    // 100 tokens per second
            [this.priorityLevels.MEDIUM]: new TokenBucket(500, 50, 1000),     // 50 tokens per second
            [this.priorityLevels.LOW]: new TokenBucket(200, 20, 1000)         // 20 tokens per second
        };

        // Initialize AIMD for each priority level
        this.aimdControllers = {
            [this.priorityLevels.HIGH]: new AIMD(2000, 200, 20000),
            [this.priorityLevels.MEDIUM]: new AIMD(1000, 100, 10000),
            [this.priorityLevels.LOW]: new AIMD(500, 50, 5000)
        };

        this.metrics = {
            latency: {},
            throughput: {},
            packetLoss: {}
        };
    }

    // Add a file transfer to the appropriate queue
    async queueTransfer(fileTransfer, priority = this.priorityLevels.MEDIUM) {
        const transfer = {
            ...fileTransfer,
            priority,
            timestamp: Date.now(),
            status: 'queued'
        };

        this.transferQueues[priority].push(transfer);
        this.transferQueues[priority].sort((a, b) => a.timestamp - b.timestamp);
        
        return transfer;
    }

    // Process the next transfer in the queue
    async processNextTransfer() {
        // Check queues in order of priority
        for (let priority = this.priorityLevels.HIGH; priority >= this.priorityLevels.LOW; priority--) {
            const queue = this.transferQueues[priority];
            if (queue.length > 0) {
                const transfer = queue[0];
                const tokenBucket = this.tokenBuckets[priority];
                const aimd = this.aimdControllers[priority];

                // Check if we have enough tokens
                if (await tokenBucket.getToken()) {
                    const currentRate = aimd.getCurrentRate();
                    
                    try {
                        // Attempt the transfer
                        await this.executeTransfer(transfer, currentRate);
                        aimd.onSuccess();
                        queue.shift(); // Remove the completed transfer
                        return true;
                    } catch (error) {
                        aimd.onCongestion();
                        this.updateMetrics(priority, 'error', error);
                        return false;
                    }
                }
            }
        }
        return false;
    }

    // Execute the actual file transfer
    async executeTransfer(transfer, rate) {
        // Implement the actual file transfer logic here
        // This is a placeholder for the actual implementation
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate for demo
                    resolve();
                } else {
                    reject(new Error('Transfer failed'));
                }
            }, 1000);
        });
    }

    // Update metrics for a transfer
    updateMetrics(priority, type, data) {
        const now = Date.now();
        
        if (type === 'latency') {
            this.metrics.latency[priority] = {
                value: data,
                timestamp: now
            };
        } else if (type === 'throughput') {
            this.metrics.throughput[priority] = {
                value: data,
                timestamp: now
            };
        } else if (type === 'packetLoss') {
            this.metrics.packetLoss[priority] = {
                value: data,
                timestamp: now
            };
        }
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            queueLengths: {
                [this.priorityLevels.HIGH]: this.transferQueues[this.priorityLevels.HIGH].length,
                [this.priorityLevels.MEDIUM]: this.transferQueues[this.priorityLevels.MEDIUM].length,
                [this.priorityLevels.LOW]: this.transferQueues[this.priorityLevels.LOW].length
            },
            aimdStats: {
                [this.priorityLevels.HIGH]: this.aimdControllers[this.priorityLevels.HIGH].getStats(),
                [this.priorityLevels.MEDIUM]: this.aimdControllers[this.priorityLevels.MEDIUM].getStats(),
                [this.priorityLevels.LOW]: this.aimdControllers[this.priorityLevels.LOW].getStats()
            }
        };
    }
}

export default QoSManager; 