// lib/socket.js - Singleton Socket.IO client
let socketInstance = null;

export function getSocket() {
    // SSR guard - only initialize on client
    if (typeof window === 'undefined') return null;

    // Return existing instance if available
    if (socketInstance) return socketInstance;

    // Dynamic import to avoid SSR issues
    const { io } = require('socket.io-client');

    socketInstance = io('/', {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
    });

    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
        socketInstance.on('connect', () => {
            console.debug('🔌 Socket connected:', socketInstance.id);
        });

        socketInstance.on('disconnect', (reason) => {
            console.debug('🔌 Socket disconnected:', reason);
        });

        socketInstance.on('connect_error', (error) => {
            console.debug('🔌 Socket connection error:', error);
        });
    }

    return socketInstance;
}

// Helper to disconnect socket (useful for cleanup)
export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}