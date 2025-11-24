// hooks/useSocketChannel.js - Standardized Socket.IO channel hook
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

export default function useSocketChannel(channel, handlers = {}, options = {}) {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const handlersRef = useRef({});
    const cleanupFnsRef = useRef([]);
    const pollTimerRef = useRef(null);

    const {
        enablePollingFallback = true,
        pollFn = null,
        pollIntervalMs = 5000,
        autoSubscribe = true
    } = options;

    // Update handlers ref when handlers change
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const startPolling = useCallback(() => {
        if (!enablePollingFallback || !pollFn || pollTimerRef.current) return;

        if (process.env.NODE_ENV === 'development') {
            console.debug(`📊 Starting polling fallback for channel: ${channel}`);
        }

        pollTimerRef.current = setInterval(() => {
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                try {
                    pollFn();
                } catch (error) {
                    console.warn('Polling function failed:', error);
                }
            }
        }, pollIntervalMs);
    }, [channel, enablePollingFallback, pollFn, pollIntervalMs]);

    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;

            if (process.env.NODE_ENV === 'development') {
                console.debug(`📊 Stopped polling fallback for channel: ${channel}`);
            }
        }
    }, [channel]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socketRef.current = socket;

        // Connection state handlers
        const onConnect = () => {
            setConnected(true);
            stopPolling();

            if (process.env.NODE_ENV === 'development') {
                console.debug(`🔌 Connected to channel: ${channel}`);
            }
        };

        const onDisconnect = () => {
            setConnected(false);
            startPolling();

            if (process.env.NODE_ENV === 'development') {
                console.debug(`🔌 Disconnected from channel: ${channel}`);
            }
        };

        // Subscribe to channel if autoSubscribe is enabled
        if (autoSubscribe) {
            const subscribeEvent = `${channel}:subscribe`;
            socket.emit(subscribeEvent);

            if (process.env.NODE_ENV === 'development') {
                console.debug(`📡 Subscribed to channel: ${channel}`);
            }
        }

        // Attach event handlers
        const eventCleanupFns = [];
        Object.entries(handlers).forEach(([event, handlerFn]) => {
            const namespacedEvent = `${channel}:${event}`;
            const wrappedHandler = (payload) => {
                try {
                    handlerFn(payload, socket);
                } catch (error) {
                    console.error(`Error in ${namespacedEvent} handler:`, error);
                }
            };

            socket.on(namespacedEvent, wrappedHandler);
            eventCleanupFns.push(() => {
                socket.off(namespacedEvent, wrappedHandler);
                if (process.env.NODE_ENV === 'development') {
                    console.debug(`🧹 Removed handler for: ${namespacedEvent}`);
                }
            });

            if (process.env.NODE_ENV === 'development') {
                console.debug(`👂 Added handler for: ${namespacedEvent}`);
            }
        });

        // Connection event listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Set initial connection state
        setConnected(socket.connected);

        // Start polling if disconnected
        if (!socket.connected) {
            startPolling();
        }

        // Store cleanup functions
        cleanupFnsRef.current = [
            () => socket.off('connect', onConnect),
            () => socket.off('disconnect', onDisconnect),
            ...eventCleanupFns
        ];

        // Cleanup function
        return () => {
            // Unsubscribe from channel
            if (autoSubscribe) {
                try {
                    const unsubscribeEvent = `${channel}:unsubscribe`;
                    socket.emit(unsubscribeEvent);

                    if (process.env.NODE_ENV === 'development') {
                        console.debug(`📡 Unsubscribed from channel: ${channel}`);
                    }
                } catch (error) {
                    console.warn('Failed to unsubscribe from channel:', error);
                }
            }

            // Clean up all event listeners
            cleanupFnsRef.current.forEach(cleanup => {
                try {
                    cleanup();
                } catch (error) {
                    console.warn('Error during cleanup:', error);
                }
            });

            // Stop polling
            stopPolling();

            if (process.env.NODE_ENV === 'development') {
                console.debug(`🧹 Cleaned up channel: ${channel}`);
            }
        };
    }, [channel, startPolling, stopPolling, autoSubscribe, handlers]);

    // Manual subscribe/unsubscribe methods
    const subscribe = useCallback(() => {
        const socket = socketRef.current;
        if (socket) {
            socket.emit(`${channel}:subscribe`);
            if (process.env.NODE_ENV === 'development') {
                console.debug(`📡 Manually subscribed to channel: ${channel}`);
            }
        }
    }, [channel]);

    const unsubscribe = useCallback(() => {
        const socket = socketRef.current;
        if (socket) {
            socket.emit(`${channel}:unsubscribe`);
            if (process.env.NODE_ENV === 'development') {
                console.debug(`📡 Manually unsubscribed from channel: ${channel}`);
            }
        }
    }, [channel]);

    return {
        socket: socketRef.current,
        connected,
        subscribe,
        unsubscribe
    };
}