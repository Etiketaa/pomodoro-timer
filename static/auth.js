/**
 * Authentication Manager for Pomodoro Timer v2
 * Handles user registration, login, logout, and auth state
 */

import {
    auth,
    db,
    googleProvider,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
        this._initAuthListener();
    }

    _initAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) {
                // Ensure user doc exists in Firestore
                await this._ensureUserDocument(user);
                this._updateUI(true, user);
            } else {
                this._updateUI(false, null);
            }
            // Notify all registered callbacks
            this.onAuthChangeCallbacks.forEach(cb => cb(user));
        });
    }

    async _ensureUserDocument(user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    displayName: user.displayName || user.email.split('@')[0],
                    displayNameLower: (user.displayName || user.email.split('@')[0]).toLowerCase(),
                    email: user.email,
                    photoURL: user.photoURL || null,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
                // Migrate localStorage data on first login
                await this._migrateLocalData(user.uid);
            } else {
                await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            }
        } catch (error) {
            console.error('Error ensuring user document:', error);
        }
    }

    async _migrateLocalData(uid) {
        try {
            const keysToMigrate = {
                'pomodoroSettings': 'settings',
                'pomodoroTasks': 'tasks',
                'pomodoroStats': 'stats',
                'pomodoroLastStation': 'musicPrefs',
                'pomodoroMusicVolume': 'musicVolume',
                'pomodoroTheme': 'theme'
            };

            const migratedData = {};
            for (const [lsKey, firestoreKey] of Object.entries(keysToMigrate)) {
                const data = localStorage.getItem(lsKey);
                if (data) {
                    try {
                        migratedData[firestoreKey] = JSON.parse(data);
                    } catch {
                        migratedData[firestoreKey] = data;
                    }
                }
            }

            if (Object.keys(migratedData).length > 0) {
                const userDataRef = doc(db, 'users', uid, 'data', 'appData');
                await setDoc(userDataRef, {
                    ...migratedData,
                    migratedAt: serverTimestamp()
                });
                console.log('✅ Local data migrated to cloud successfully');
            }
        } catch (error) {
            console.error('Error migrating local data:', error);
        }
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
                const initial = (user.displayName || user.email)[0].toUpperCase();
                if (user.photoURL) {
                    userAvatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" class="avatar-img">`;
                } else {
                    userAvatar.innerHTML = `<span class="avatar-initial">${initial}</span>`;
                }
            }
            if (userName) {
                userName.textContent = user.displayName || user.email.split('@')[0];
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
            const result = await createUserWithEmailAndPassword(auth, email, password);
            if (displayName) {
                await updateProfile(result.user, { displayName });
            }
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    }

    async login(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    }

    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this._getErrorMessage(error.code) };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.uid || null;
    }

    _getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Este email ya está registrado.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/invalid-email': 'El email no es válido.',
            'auth/user-not-found': 'No existe una cuenta con este email.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
            'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
            'auth/invalid-credential': 'Credenciales inválidas. Verifica tu email y contraseña.',
        };
        return messages[code] || 'Ocurrió un error. Intenta de nuevo.';
    }
}

// Modal controller for Auth UI
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

        // Tab switching
        this.loginTab?.addEventListener('click', () => this._switchTab('login'));
        this.registerTab?.addEventListener('click', () => this._switchTab('register'));

        // Form submissions
        this.loginForm?.addEventListener('submit', (e) => this._handleLogin(e));
        this.registerForm?.addEventListener('submit', (e) => this._handleRegister(e));

        // Google login
        document.getElementById('google-login-btn')?.addEventListener('click', () => this._handleGoogleLogin());

        // Close modal
        document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Open modal
        document.getElementById('auth-btn')?.addEventListener('click', () => this.open());

        // User menu
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

    async _handleGoogleLogin() {
        const result = await this.authManager.loginWithGoogle();
        if (result.success) {
            this.close();
        } else {
            this._showError(result.error);
        }
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
