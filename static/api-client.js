/**
 * API Client for Pomodoro Timer
 * Handles all HTTP requests to the backend with JWT authentication.
 */

const API_BASE = '/api';

class ApiClient {
    constructor() {
        this._token = localStorage.getItem('pomodoroToken');
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
        if (value) {
            localStorage.setItem('pomodoroToken', value);
        } else {
            localStorage.removeItem('pomodoroToken');
        }
    }

    /**
     * Make an authenticated HTTP request.
     */
    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (this._token) {
            headers['Authorization'] = `Bearer ${this._token}`;
        }

        const opts = { method, headers };
        if (body && method !== 'GET') {
            opts.body = JSON.stringify(body);
        }

        const res = await fetch(`${API_BASE}${path}`, opts);
        const data = await res.json();

        if (!res.ok) {
            throw new ApiError(data.error || 'Error del servidor', res.status);
        }

        return data;
    }

    // ---- Auth ----

    async register(email, password, displayName) {
        const data = await this.request('POST', '/auth/register', {
            email, password, displayName
        });
        this.token = data.token;
        return data.user;
    }

    async login(email, password) {
        const data = await this.request('POST', '/auth/login', {
            email, password
        });
        this.token = data.token;
        return data.user;
    }

    loginWithGoogle() {
        window.location.href = `${API_BASE}/auth/google`;
    }

    async getMe() {
        return await this.request('GET', '/auth/me');
    }

    async updatePublicKey(publicKey) {
        return await this.request('PUT', '/auth/public-key', { publicKey });
    }

    async searchUsers(query) {
        return await this.request('GET', `/auth/search?q=${encodeURIComponent(query)}`);
    }

    logout() {
        this.token = null;
    }

    isAuthenticated() {
        return !!this._token;
    }

    // ---- Chat (Phase 4) ----

    async getChats() {
        return await this.request('GET', '/chat/chats');
    }

    async getMessages(chatId) {
        return await this.request('GET', `/chat/chats/${chatId}/messages`);
    }

    async sendMessage(chatId, text) {
        return await this.request('POST', `/chat/chats/${chatId}/messages`, { text });
    }

    // ---- Sync (Phase 3) ----

    async syncFromCloud() {
        return await this.request('GET', '/sync/data');
    }

    async syncToCloud(data) {
        return await this.request('PUT', '/sync/data', data);
    }

    async syncKey(key, value) {
        return await this.request('PATCH', `/sync/data/${key}`, { value });
    }

    // ---- Feedback ----

    async submitFeedback(name, rating, message) {
        return await this.request('POST', '/feedback', { name, rating, message });
    }

    async getFeedback() {
        return await this.request('GET', '/feedback');
    }
}

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// Singleton
const apiClient = new ApiClient();

export { apiClient, ApiError };
