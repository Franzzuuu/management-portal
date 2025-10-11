import { ensureIO } from '@/lib/realtime';

export const GET = async () => {
    try {
        ensureIO();
        return new Response('socket ready', { status: 200 });
    } catch (error) {
        console.error('Socket initialization error:', error);
        return new Response('socket error', { status: 500 });
    }
};