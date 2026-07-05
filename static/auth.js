/**
 * Authentication Manager for Pomodoro Timer v2
 * Handles user registration, login, logout, and auth state.
 * Uses JWT tokens instead of Firebase Auth.
 */

import { apiClient } from './api-client.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
        this._init();
    }

    async _init() {
        // Check for token from Google OAuth redirect
        this._handleOAuthRedirect();

        // If we have a token, try to load the user
        if (apiClient.isAuthenticated()) {
            try {
                const { user } = await apiClient.getMe();
                this.currentUser = user;
                this._updateUI(true, user);
                this._notifyCallbacks(user);
            } catch (e) {
                // Token invalid/expired
                apiClient.logout();
                this._updateUI(false, null);
                this._notifyCallbacks(null);
            }
        } else {
            this._updateUI(false, null);
            this._notifyCallbacks(null);
        }
    }

    _handleOAuthRedirect() {
        const hash = window.location.hash;
        if (hash && hash.includes('token=')) {
            const token = hash.split('token=')[1].split('&')[0];
            if (token) {
                apiClient.token = token;
                // Clean the URL
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
    }

    _notifyCallbacks(user) {
        this.onAuthChangeCallbacks.forEach(cb => cb(user));
    }

    _updateUI(isLoggedIn, user) {
        const authBtn = document.getElementById('auth-btn');
        const userAvatar = document.getElementById('user-avatar');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');

        if (!authBtn) return;

        if (isLoggedIn && user) {
            authBtn.classList.add('hidden');
            if (userAvatar) {
                userAvatar.classList.remove('hidden');
                const initial = (user.display_name || user.email)[0].toUpperCase();
                if (user.photo_url) {
                    userAvatar.innerHTML = `<img src="${user.photo_url}" alt="avatar" class="avatar-img">`;
                } else {
                    userAvatar.innerHTML = `<span class="avatar-initial">${initial}</span>`;
                }
            }
            if (userName) {
                userName.textContent = user.display_name || user.email.split('@')[0];
            }
        } else {
            authBtn.classList.remove('hidden');
            if (userAvatar) userAvatar.classList.add('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }

    // --- Public Methods ---

    async register(email, password, displayName) {
        try {
            const user = await apiClient.register(email, password, displayName);
            this.currentUser = user;
            this._updateUI(true, user);
            this._notifyCallbacks(user);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const user = await apiClient.login(email, password);
            this.currentUser = user;
            this._updateUI(true, user);
            this._notifyCallbacks(user);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    loginWithGoogle() {
        apiClient.loginWithGoogle();
    }

    async logout() {
        apiClient.logout();
        this.currentUser = null;
        this._updateUI(false, null);
        this._notifyCallbacks(null);
        return { success: true };
    }

    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id || null;
    }

    getUser() {
        return this.currentUser;
    }
}


/**
 * Modal controller for Auth UI (login/register forms)
 */
class AuthModalController {
    constructor(authManager) {
        this.authManager = authManager;
        this.modal = document.getElementById('auth-modal');
        this.loginTab = document.getElementById('auth-login-tab');
        this.registerTab = document.getElementById('auth-register-tab');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.errorDisplay = document.getElementById('auth-error');
        this._bindEvents();
    }

    _bindEvents() {
        if (!this.modal) return;

        this.loginTab?.addEventListener('click', () => this._switchTab('login'));
        this.registerTab?.addEventListener('click', () => this._switchTab('register'));

        this.loginForm?.addEventListener('submit', (e) => this._handleLogin(e));
        this.registerForm?.addEventListener('submit', (e) => this._handleRegister(e));

        document.getElementById('google-login-btn')?.addEventListener('click', () => {
            this.authManager.loginWithGoogle();
        });

        document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.getElementById('auth-btn')?.addEventListener('click', () => this.open());

        document.getElementById('user-avatar')?.addEventListener('click', () => {
            const menu = document.getElementById('user-menu');
            menu?.classList.toggle('hidden');
        });

        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await this.authManager.logout();
            document.getElementById('user-menu')?.classList.add('hidden');
        });
    }

    _switchTab(tab) {
        this._clearError();
        if (tab === 'login') {
            this.loginTab?.classList.add('active');
            this.registerTab?.classList.remove('active');
            this.loginForm?.classList.remove('hidden');
            this.registerForm?.classList.add('hidden');
        } else {
            this.loginTab?.classList.remove('active');
            this.registerTab?.classList.add('active');
            this.loginForm?.classList.add('hidden');
            this.registerForm?.classList.remove('hidden');
        }
    }

    async _handleLogin(e) {
        e.preventDefault();
        this._clearError();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const btn = this.loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Ingresando...';

        const result = await this.authManager.login(email, password);
        if (result.success) {
            this.close();
        } else {
            this._showError(result.error);
        }
        btn.disabled = false;
        btn.textContent = 'Ingresar';
    }

    async _handleRegister(e) {
        e.preventDefault();
        this._clearError();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const btn = this.registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        const result = await this.authManager.register(email, password, name);
        if (result.success) {
            this.close();
        } else {
            this._showError(result.error);
        }
        btn.disabled = false;
        btn.textContent = 'Crear Cuenta';
    }

    _showError(message) {
        if (this.errorDisplay) {
            this.errorDisplay.textContent = message;
            this.errorDisplay.classList.remove('hidden');
        }
    }

    _clearError() {
        if (this.errorDisplay) {
            this.errorDisplay.textContent = '';
            this.errorDisplay.classList.add('hidden');
        }
    }

    open() {
        this.modal?.classList.remove('hidden');
        this._switchTab('login');
    }

    close() {
        this.modal?.classList.add('hidden');
        this._clearError();
    }
}

export { AuthManager, AuthModalController };
