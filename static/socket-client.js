/**
 * Socket.IO Client for Pomodoro Timer v2
 * Handles real-time chat, typing indicators, and presence.
 *
 * Usage:
 *   import { socketClient } from './socket-client.js';
 *   socketClient.connect(token);
 *   socketClient.on('new_message', (msg) => { ... });
 *   socketClient.sendMessage(chatId, text);
 */

import { apiClient } from './api-client.js';

class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this._listeners = {};
        this._reconnectDelay = 1000;
        this._typingTimers = {};
    }

    /**
     * Connect to Socket.IO server.
     */
    connect(token) {
        if (this.socket?.connected) return;

        const path = '/api/index.py/socket.io';
        this.socket = io(window.location.origin, {
            path,
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            this._reconnectDelay = 1000;
            console.log('[Socket] Connected');
            this._emit('connected');
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('[Socket] Disconnected:', reason);
            this._emit('disconnected', reason);
        });

        this.socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
        });

        // Reconnection
        this.socket.io.on('reconnect', (attempt) => {
            console.log(`[Socket] Reconnected after ${attempt} attempts`);
            this._emit('reconnected');
        });

        // Forward all server events to local listeners
        const events = [
            'new_message', 'user_typing', 'user_stop_typing',
            'user_online', 'user_offline', 'online_users',
            'pomodoro_user_joined', 'pomodoro_update',
        ];
        events.forEach(event => {
            this.socket.on(event, (data) => this._emit(event, data));
        });
    }

    /**
     * Disconnect from server.
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Join a chat room.
     */
    joinChat(chatId) {
        this.socket?.emit('join_chat', { chatId });
    }

    /**
     * Leave a chat room.
     */
    leaveChat(chatId) {
        this.socket?.emit('leave_chat', { chatId });
    }

    /**
     * Send a message via Socket.IO.
     */
    sendMessage(chatId, text) {
        this.socket?.emit('send_message', { chatId, text });
    }

    /**
     * Emit typing indicator (debounced).
     */
    startTyping(chatId) {
        if (!this._typingTimers[chatId]) {
            this.socket?.emit('typing', { chatId });
        }
        clearTimeout(this._typingTimers[chatId]);
        this._typingTimers[chatId] = setTimeout(() => {
            this.socket?.emit('stop_typing', { chatId });
            delete this._typingTimers[chatId];
        }, 2000);
    }

    /**
     * Get list of online users.
     */
    getOnlineUsers() {
        this.socket?.emit('get_online_users');
    }

    // ---- Event listener management ----

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }

    _emit(event, data) {
        (this._listeners[event] || []).forEach(cb => {
            try { cb(data); } catch (e) { console.error('[Socket] Listener error:', e); }
        });
    }
}

const socketClient = new SocketClient();

export { socketClient };
