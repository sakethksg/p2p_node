import { QoSManager } from './index';
import { encryptFile, decryptFile, calculateHash } from '../crypto';
import TokenBucket from './TokenBucket';
import AIMD from './AIMD';

class FileTransferManager {
    constructor() {
        this.qosManager = new QoSManager();
        this.activeTransfers = new Map();
    }

    async sendFile(file, peer, priority = 'MEDIUM') {
        const transferId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Prepare file data
            const key = crypto.getRandomValues(new Uint8Array(32)).join('');
            const encrypted = await encryptFile(file, key);
            const hash = await calculateHash(file);

            const fileData = {
                id: transferId,
                name: file.name,
                type: file.type,
                size: file.size,
                key,
                hash,
                data: encrypted,
                priority
            };

            // Queue the transfer with QoS
            await this.qosManager.queueTransfer(fileData, this.qosManager.priorityLevels[priority]);

            // Send initial metadata
            peer.send({
                type: 'file-metadata',
                fileData: {
                    id: transferId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    priority
                }
            });

            // Start processing transfers
            this.processTransfers(peer);

            return transferId;
        } catch (error) {
            console.error('Error preparing file transfer:', error);
            throw error;
        }
    }

    async processTransfers(peer) {
        while (true) {
            const transfer = await this.qosManager.processNextTransfer();
            if (!transfer) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            try {
                // Send the file data in chunks
                const chunkSize = 16384; // 16KB chunks
                const data = transfer.data;
                
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    peer.send({
                        type: 'file-chunk',
                        transferId: transfer.id,
                        chunk,
                        index: i,
                        total: data.length
                    });

                    // Wait for acknowledgment
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Send completion message
                peer.send({
                    type: 'file-complete',
                    transferId: transfer.id
                });

            } catch (error) {
                console.error('Error processing transfer:', error);
                peer.send({
                    type: 'file-error',
                    transferId: transfer.id,
                    error: error.message
                });
            }
        }
    }

    async receiveFile(data, peer) {
        if (data.type === 'file-metadata') {
            // Initialize transfer tracking
            this.activeTransfers.set(data.fileData.id, {
                ...data.fileData,
                chunks: [],
                receivedSize: 0
            });
            return;
        }

        if (data.type === 'file-chunk') {
            const transfer = this.activeTransfers.get(data.transferId);
            if (!transfer) return;

            transfer.chunks[data.index] = data.chunk;
            transfer.receivedSize += data.chunk.length;

            // Send acknowledgment
            peer.send({
                type: 'chunk-received',
                transferId: data.transferId,
                index: data.index
            });
            return;
        }

        if (data.type === 'file-complete') {
            const transfer = this.activeTransfers.get(data.transferId);
            if (!transfer) return;

            // Combine chunks and decrypt
            const combinedData = transfer.chunks.join('');
            const decrypted = await decryptFile(
                combinedData,
                transfer.key,
                transfer.name,
                transfer.type
            );

            // Verify integrity
            const receivedHash = await calculateHash(decrypted);
            if (receivedHash !== transfer.hash) {
                throw new Error('File integrity check failed');
            }

            // Clean up
            this.activeTransfers.delete(data.transferId);

            return {
                file: decrypted,
                name: transfer.name,
                size: transfer.size,
                type: transfer.type
            };
        }
    }

    getTransferProgress(transferId) {
        const transfer = this.activeTransfers.get(transferId);
        if (!transfer) return null;

        return {
            progress: (transfer.receivedSize / transfer.size) * 100,
            size: transfer.size,
            receivedSize: transfer.receivedSize
        };
    }

    getQoSMetrics() {
        return this.qosManager.getMetrics();
    }

    updateTokenBucketConfigs(configs) {
        // Update token buckets for each priority level
        Object.entries(configs).forEach(([priority, config]) => {
            const priorityLevel = this.qosManager.priorityLevels[priority];
            const { capacity, refillRate } = config;
            
            // Create a new token bucket with updated parameters
            this.qosManager.tokenBuckets[priorityLevel] = new TokenBucket(
                capacity, 
                refillRate, 
                1000 // Keep the same refill interval
            );
        });
        
        console.log('Token bucket configurations updated:', configs);
    }

    updateAIMDConfigs(configs) {
        // Update AIMD controllers for each priority level
        Object.entries(configs).forEach(([priority, config]) => {
            const priorityLevel = this.qosManager.priorityLevels[priority];
            const { initialRate, minRate, maxRate, increaseFactor, decreaseFactor } = config;
            
            // Create a new AIMD controller with updated parameters
            this.qosManager.aimdControllers[priorityLevel] = new AIMD(
                initialRate,
                minRate,
                maxRate
            );
            
            // Update the increase and decrease factors
            this.qosManager.aimdControllers[priorityLevel].increaseFactor = increaseFactor;
            this.qosManager.aimdControllers[priorityLevel].decreaseFactor = decreaseFactor;
        });
        
        console.log('AIMD configurations updated:', configs);
    }
}

export default FileTransferManager; 