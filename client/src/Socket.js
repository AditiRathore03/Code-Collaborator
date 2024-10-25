import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };

    // Use the environment variable with a fallback
    const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || '/api/socket';
    return io(SOCKET_URL, options);
};