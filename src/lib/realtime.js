let ioInstance = null;
let httpServer = null;

export function ensureIO() {
    if (ioInstance) return { io: ioInstance, server: httpServer };

    const { createServer } = require('http');
    const { Server } = require('socket.io');

    httpServer = global._httpServer ?? createServer((_, res) => res.end('OK'));
    if (!global._httpServer) {
        httpServer.listen(0); // ephemeral; in prod, bind to your real server
        global._httpServer = httpServer;
    }

    ioInstance = global._io ?? new Server(httpServer, {
        path: '/api/socket',
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    global._io = ioInstance;

    ioInstance.on('connection', (socket) => {
        console.log('Socket client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('Socket client disconnected:', socket.id);
        });
    });

    return { io: ioInstance, server: httpServer };
}

// Helper to emit from server code after DB writes:
export function emit(channel, payload) {
    try {
        const { io } = ensureIO();
        io.emit(channel, payload);
        console.log(`Emitted to channel ${channel}:`, payload);
    } catch (error) {
        console.error('Error emitting to socket:', error);
    }
}