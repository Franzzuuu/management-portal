import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useRealtime({ channels = [], onEvent, pollUrl, connectTries = 3 }) {
    const socketRef = useRef(null);
    const pollRef = useRef(null);
    const triesRef = useRef(0);

    // Serialize channels for stable dependency
    const channelsKey = JSON.stringify(channels);

    useEffect(() => {
        // Don't initialize if no channels or event handler
        if (!channels.length || !onEvent) return;

        let socket = null;
        let handlers = {}; // Move handlers outside try block

        try {
            socket = io('', {
                path: '/api/socket',
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 500,
                reconnectionDelayMax: 5000,
                transports: ['websocket', 'polling']
            });

            socketRef.current = socket;

            // Setup event handlers for each channel
            channels.forEach((channel) => {
                const handler = (data) => {
                    console.log(`Received ${channel}:`, data);
                    onEvent(channel, data);
                };
                handlers[channel] = handler;
                socket.on(channel, handler);
            });

            // Subscribe to channels (emit subscription events)
            socket.on('connect', () => {
                console.log('Socket connected, subscribing to channels:', channels);
                channels.forEach(channel => {
                    if (channel.includes(':')) {
                        const [namespace] = channel.split(':');
                        socket.emit(`${namespace}:subscribe`);
                    }
                });
                triesRef.current = 0;
                // Clear polling if socket reconnects
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            });

            socket.on('connect_error', (error) => {
                console.warn('Socket connection error:', error);
                triesRef.current++;
                if (triesRef.current >= connectTries) {
                    startPolling();
                }
            });

            socket.on('reconnect_error', (error) => {
                console.warn('Socket reconnection error:', error);
                triesRef.current++;
                if (triesRef.current >= connectTries) {
                    startPolling();
                }
            });

            socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
            });

            // Start polling fallback after connection errors
            const startPolling = () => {
                if (pollRef.current || !pollUrl) return;

                console.log('Starting polling fallback for', channels);
                pollRef.current = setInterval(async () => {
                    try {
                        const response = await fetch(pollUrl, {
                            cache: 'no-store',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            onEvent('poll', data);
                        }
                    } catch (error) {
                        console.warn('Polling failed:', error);
                    }
                }, 2000);
            };

        } catch (error) {
            console.error('Failed to initialize socket:', error);
            // Fallback to polling immediately if socket fails to initialize
            if (pollUrl) {
                setTimeout(() => {
                    if (pollRef.current || !pollUrl) return;

                    console.log('Starting polling fallback for', channels);
                    pollRef.current = setInterval(async () => {
                        try {
                            const response = await fetch(pollUrl, {
                                cache: 'no-store',
                                headers: {
                                    'Content-Type': 'application/json',
                                }
                            });

                            if (response.ok) {
                                const data = await response.json();
                                onEvent('poll', data);
                            }
                        } catch (error) {
                            console.warn('Polling failed:', error);
                        }
                    }, 2000);
                }, 1000);
            }
        }

        // Cleanup function
        return () => {
            if (socket && handlers) {
                // Unsubscribe from channels before disconnecting
                channels.forEach(channel => {
                    if (channel.includes(':')) {
                        const [namespace] = channel.split(':');
                        socket.emit(`${namespace}:unsubscribe`);
                    }
                });

                Object.entries(handlers).forEach(([channel, handler]) => {
                    if (handler) {
                        socket.off(channel, handler);
                    }
                });
                socket.disconnect();
            }

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [channels, channelsKey, pollUrl, onEvent, connectTries]); return socketRef.current;
}