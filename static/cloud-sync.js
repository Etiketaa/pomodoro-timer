/**
 * Cloud Sync Manager for Pomodoro Timer v2
 * Abstracts data persistence: uses Firestore when logged in, localStorage as fallback
 */

import {
    db,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

class CloudSync {
    constructor(authManager) {
        this.authManager = authManager;
        this._debounceTimers = {};
    }

    /**
     * Get data by key. Tries Firestore first (if logged in), falls back to localStorage.
     */
    async get(key, defaultValue = null) {
        // If logged in, try Firestore
        if (this.authManager.isLoggedIn()) {
            try {
                const uid = this.authManager.getUserId();
                const docRef = doc(db, 'users', uid, 'data', 'appData');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data()[key] !== undefined) {
                    return snap.data()[key];
                }
            } catch (error) {
                console.warn(`CloudSync: Error reading from Firestore for key "${key}":`, error);
            }
        }
        // Fallback to localStorage
        try {
            const lsKey = this._getLSKey(key);
            const data = localStorage.getItem(lsKey);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Save data by key. Saves to both localStorage (immediate) and Firestore (debounced).
     */
    async save(key, value) {
        // Always save to localStorage immediately
        try {
            const lsKey = this._getLSKey(key);
            localStorage.setItem(lsKey, JSON.stringify(value));
        } catch (error) {
            console.warn(`CloudSync: Error saving to localStorage for key "${key}":`, error);
        }

        // If logged in, also save to Firestore (debounced to avoid excessive writes)
        if (this.authManager.isLoggedIn()) {
            this._debouncedFirestoreSave(key, value);
        }
    }

    /**
     * Force sync all localStorage data to Firestore (useful after login)
     */
    async syncToCloud() {
        if (!this.authManager.isLoggedIn()) return;

        try {
            const uid = this.authManager.getUserId();
            const docRef = doc(db, 'users', uid, 'data', 'appData');

            const data = {};
            const keys = ['settings', 'tasks', 'stats', 'musicPrefs', 'musicVolume', 'theme', 'dailyGoal', 'favoriteStations'];

            for (const key of keys) {
                const lsKey = this._getLSKey(key);
                const value = localStorage.getItem(lsKey);
                if (value) {
                    try {
                        data[key] = JSON.parse(value);
                    } catch {
                        data[key] = value;
                    }
                }
            }

            if (Object.keys(data).length > 0) {
                await setDoc(docRef, { ...data, lastSync: serverTimestamp() }, { merge: true });
                console.log('✅ All data synced to cloud');
            }
        } catch (error) {
            console.error('CloudSync: Error syncing to cloud:', error);
        }
    }

    /**
     * Pull all data from Firestore and update localStorage
     */
    async syncFromCloud() {
        if (!this.authManager.isLoggedIn()) return;

        try {
            const uid = this.authManager.getUserId();
            const docRef = doc(db, 'users', uid, 'data', 'appData');
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                const keyMap = {
                    'settings': 'pomodoroSettings',
                    'tasks': 'pomodoroTasks',
                    'stats': 'pomodoroStats',
                    'musicPrefs': 'pomodoroLastStation',
                    'musicVolume': 'pomodoroMusicVolume',
                    'theme': 'pomodoroTheme',
                    'dailyGoal': 'pomodoroDailyGoal',
                    'favoriteStations': 'pomodoroFavoriteStations'
                };

                for (const [firestoreKey, lsKey] of Object.entries(keyMap)) {
                    if (data[firestoreKey] !== undefined) {
                        localStorage.setItem(lsKey, JSON.stringify(data[firestoreKey]));
                    }
                }
                console.log('✅ Data pulled from cloud');
                return true;
            }
            return false;
        } catch (error) {
            console.error('CloudSync: Error pulling from cloud:', error);
            return false;
        }
    }

    // --- Private helpers ---

    _debouncedFirestoreSave(key, value) {
        if (this._debounceTimers[key]) {
            clearTimeout(this._debounceTimers[key]);
        }

        this._debounceTimers[key] = setTimeout(async () => {
            try {
                const uid = this.authManager.getUserId();
                if (!uid) return;

                const docRef = doc(db, 'users', uid, 'data', 'appData');
                await setDoc(docRef, {
                    [key]: value,
                    lastSync: serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.warn(`CloudSync: Error saving "${key}" to Firestore:`, error);
            }
        }, 2000); // 2 second debounce
    }

    _getLSKey(key) {
        const keyMap = {
            'settings': 'pomodoroSettings',
            'tasks': 'pomodoroTasks',
            'stats': 'pomodoroStats',
            'musicPrefs': 'pomodoroLastStation',
            'musicVolume': 'pomodoroMusicVolume',
            'theme': 'pomodoroTheme',
            'dailyGoal': 'pomodoroDailyGoal',
            'favoriteStations': 'pomodoroFavoriteStations'
        };
        return keyMap[key] || key;
    }
}

export { CloudSync };
