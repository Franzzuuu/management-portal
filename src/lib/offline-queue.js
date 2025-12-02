/**
 * Offline Queue System for Handheld Devices
 * 
 * Stores violation reports locally when offline and syncs when online
 */

const QUEUE_STORAGE_KEY = 'offline_violation_queue';
const MAX_QUEUE_SIZE = 100;
const SYNC_RETRY_INTERVAL = 30000; // 30 seconds

/**
 * Add a violation report to the offline queue
 */
export function queueViolationReport(data) {
    try {
        const queue = getQueue();
        
        const queueItem = {
            id: Date.now() + Math.random(), // Unique ID
            timestamp: new Date().toISOString(),
            data: {
                tag_uid: data.tag_uid,
                violation_type_id: data.violation_type_id,
                location: data.location || null,
                // Store image as base64 to save in localStorage
                photo_base64: data.photo_base64,
                photo_name: data.photo_name,
                photo_type: data.photo_type
            },
            status: 'pending', // pending, syncing, failed, completed
            retryCount: 0,
            error: null
        };

        queue.push(queueItem);
        
        // Limit queue size
        if (queue.length > MAX_QUEUE_SIZE) {
            queue.shift(); // Remove oldest item
        }
        
        saveQueue(queue);
        return queueItem;
    } catch (error) {
        console.error('Failed to queue violation:', error);
        return null;
    }
}

/**
 * Get all queued violations
 */
export function getQueue() {
    try {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to get queue:', error);
        return [];
    }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue) {
    try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Failed to save queue:', error);
    }
}

/**
 * Remove an item from the queue
 */
export function removeFromQueue(itemId) {
    const queue = getQueue();
    const filtered = queue.filter(item => item.id !== itemId);
    saveQueue(filtered);
}

/**
 * Update queue item status
 */
export function updateQueueItemStatus(itemId, status, error = null) {
    const queue = getQueue();
    const item = queue.find(item => item.id === itemId);
    if (item) {
        item.status = status;
        item.error = error;
        if (status === 'failed') {
            item.retryCount = (item.retryCount || 0) + 1;
        }
        saveQueue(queue);
    }
}

/**
 * Sync all pending violations to the server
 */
export async function syncQueue() {
    const queue = getQueue();
    const pending = queue.filter(item => 
        item.status === 'pending' || 
        (item.status === 'failed' && item.retryCount < 3)
    );

    if (pending.length === 0) {
        return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
        try {
            updateQueueItemStatus(item.id, 'syncing');

            // Convert base64 back to File
            const photoBlob = base64ToBlob(item.data.photo_base64, item.data.photo_type);
            const photoFile = new File([photoBlob], item.data.photo_name, { 
                type: item.data.photo_type 
            });

            // Create FormData
            const formData = new FormData();
            formData.append('tag_uid', item.data.tag_uid);
            formData.append('violation_type_id', item.data.violation_type_id);
            if (item.data.location) {
                formData.append('location', item.data.location);
            }
            formData.append('photo', photoFile);

            // Send to server
            const response = await fetch('/api/violations/quick-report', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                updateQueueItemStatus(item.id, 'completed');
                removeFromQueue(item.id);
                synced++;
            } else {
                const error = await response.text();
                updateQueueItemStatus(item.id, 'failed', error);
                failed++;
            }
        } catch (error) {
            console.error('Sync failed for item:', item.id, error);
            updateQueueItemStatus(item.id, 'failed', error.message);
            failed++;
        }
    }

    return { success: true, synced, failed, remaining: getQueue().length };
}

/**
 * Convert base64 to Blob
 */
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert File to base64 for storage
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Start auto-sync interval
 */
export function startAutoSync(intervalMs = SYNC_RETRY_INTERVAL) {
    const syncInterval = setInterval(async () => {
        if (navigator.onLine) {
            const result = await syncQueue();
            console.log('Auto-sync result:', result);
        }
    }, intervalMs);

    return syncInterval; // Return so it can be cleared if needed
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
    const queue = getQueue();
    return {
        total: queue.length,
        pending: queue.filter(item => item.status === 'pending').length,
        syncing: queue.filter(item => item.status === 'syncing').length,
        failed: queue.filter(item => item.status === 'failed').length,
        completed: queue.filter(item => item.status === 'completed').length
    };
}

/**
 * Clear completed items from queue
 */
export function clearCompleted() {
    const queue = getQueue();
    const filtered = queue.filter(item => item.status !== 'completed');
    saveQueue(filtered);
}
