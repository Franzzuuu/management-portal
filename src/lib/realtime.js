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

        // Handle access logs subscriptions
        socket.on('access_logs:subscribe', () => {
            console.log(`Client ${socket.id} subscribed to access_logs updates`);
            socket.join('access_logs_room');
        });

        socket.on('access_logs:unsubscribe', () => {
            console.log(`Client ${socket.id} unsubscribed from access_logs updates`);
            socket.leave('access_logs_room');
        });

        // Handle violations subscriptions
        socket.on('violations:subscribe', () => {
            console.log(`Client ${socket.id} subscribed to violations updates`);
            socket.join('violations_room');
        });

        socket.on('violations:unsubscribe', () => {
            console.log(`Client ${socket.id} unsubscribed from violations updates`);
            socket.leave('violations_room');
        });

        // Handle vehicles subscriptions
        socket.on('vehicles:subscribe', () => {
            console.log(`Client ${socket.id} subscribed to vehicles updates`);
            socket.join('vehicles_room');
        });

        socket.on('vehicles:unsubscribe', () => {
            console.log(`Client ${socket.id} unsubscribed from vehicles updates`);
            socket.leave('vehicles_room');
        });

        // Handle appeals subscriptions
        socket.on('appeals:subscribe', () => {
            console.log(`Client ${socket.id} subscribed to appeals updates`);
            socket.join('appeals_room');
        });

        socket.on('appeals:unsubscribe', () => {
            console.log(`Client ${socket.id} unsubscribed from appeals updates`);
            socket.leave('appeals_room');
        });

        // Handle dashboard subscriptions
        socket.on('dashboard:subscribe', () => {
            console.log(`Client ${socket.id} subscribed to dashboard updates`);
            socket.join('dashboard_room');
        });

        socket.on('dashboard:unsubscribe', () => {
            console.log(`Client ${socket.id} unsubscribed from dashboard updates`);
            socket.leave('dashboard_room');
        });

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

        // Route to appropriate room based on channel prefix
        if (channel.startsWith('access_logs:')) {
            io.to('access_logs_room').emit(channel, payload);
            console.log(`Emitted to access_logs_room on channel ${channel}:`, payload);
        } else if (channel.startsWith('violations:')) {
            io.to('violations_room').emit(channel, payload);
            console.log(`Emitted to violations_room on channel ${channel}:`, payload);
        } else if (channel.startsWith('vehicles:')) {
            io.to('vehicles_room').emit(channel, payload);
            console.log(`Emitted to vehicles_room on channel ${channel}:`, payload);
        } else if (channel.startsWith('appeals:')) {
            io.to('appeals_room').emit(channel, payload);
            console.log(`Emitted to appeals_room on channel ${channel}:`, payload);
        } else if (channel.startsWith('dashboard:')) {
            io.to('dashboard_room').emit(channel, payload);
            console.log(`Emitted to dashboard_room on channel ${channel}:`, payload);
        } else {
            // For other channels, emit globally
            io.emit(channel, payload);
            console.log(`Emitted globally to channel ${channel}:`, payload);
        }
    } catch (error) {
        console.error('Error emitting to socket:', error);
    }
}