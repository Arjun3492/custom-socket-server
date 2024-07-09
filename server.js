import dotenv from 'dotenv';
dotenv.config();

import { Redis } from 'ioredis';
import { createServer } from 'http';
import { Server } from 'socket.io';

const hostname = 'localhost';
const port = 3004;

const checkENV = () => {
    const requiredEnvVars = {
        REDIS_HOST: 'Redis host',
        SUBNET_V1: 'Subnets',
        SUBNET_V2: 'Subnets',
        SUBNET_V3: 'Subnets',
        SECURITY_GROUP: 'Security Group',
        AWS_REGION: 'AWS Credentials',
        AWS_ACCESS_KEY_ID: 'AWS Credentials',
        AWS_SECRET_ACCESS_KEY: 'AWS Credentials',
        ECS_CLUSTER_ARN: 'ECS Cluster',
        ECS_TASK_ARN: 'ECS Task',
        CONTAINER_IMAGE: 'Container Image',
    };

    for (const [key, description] of Object.entries(requiredEnvVars)) {
        if (!process.env[key]) {
            console.error(`${description} not assigned in env`);
            process.exit(1);
        }
    }
};
checkENV();

const httpServer = createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, this is your custom server for multiple apps');
});

const io = new Server(httpServer, {
    cors: {
        origin: '*', // Adjust as necessary
    },
});

io.on('connection', (socket) => {
    console.log('server is connected');

    // App 1 logic
    socket.on('subscribe', (channel) => {
        console.log('server is subscribing to channel', channel);
        socket.join(channel);
        const subscriber = new Redis(process.env.REDIS_HOST);

        subscriber.psubscribe('logs:*');
        subscriber.on('pmessage', (pattern, channel, message) => {
            console.log(`Received message: ${message} from channel: ${channel}`);

            io.to(channel).emit('message', message);
        });
    });

    // App 2 logic
    socket.on('join-room', (roomId, userId) => {
        console.log(`a new user ${userId} joined room ${roomId}`);
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-connected', userId);
    });

    socket.on('user-toggle-audio', (userId, roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-toggle-audio', userId);
    });

    socket.on('user-toggle-video', (userId, roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-toggle-video', userId);
    });

    socket.on('user-leave', (userId, roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-leave', userId);
    });
});

httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
}).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
});
