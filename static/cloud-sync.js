/**
 * Cloud Sync Manager for Pomodoro Timer v2
 * Uses REST API (PostgreSQL) instead of Firestore.
 * localStorage is always the primary store; cloud is backup.
 */

import { apiClient } from './api-client.js';

// Map: cloud key → localStorage key
const KEY_MAP = {
    'settings': 'pomodoroSettings',
    'tasks': 'pomodoroTasks',
    'stats': 'pomodoroStats',
    'musicPrefs': 'pomodoroLastStation',
    'musicVolume': 'pomodoroMusicVolume',
    'theme': 'pomodoroTheme',
    'dailyGoal': 'pomodoroDailyGoal',
    'favoriteStations': 'pomodoroFavoriteStations',
    'userProfile': 'pomodoroUserProfile',
};

const ALL_CLOUD_KEYS = Object.keys(KEY_MAP);

class CloudSync {
    constructor(authManager) {
        this.authManager = authManager;
        this._debounceTimers = {};
    }

    /**
     * Get data by key. Tries cloud first (if logged in), falls back to localStorage.
     */
    async get(key, defaultValue = null) {
        if (this.authManager.isLoggedIn()) {
            try {
                const data = await apiClient.syncKey(key, null);
                // The endpoint returns { key: value }
                const cloudKey = key;
                if (data[cloudKey] !== undefined && data[cloudKey] !== null) {
                    return data[cloudKey];
                }
            } catch (error) {
                console.warn(`CloudSync: Error reading from cloud for key "${key}":`, error);
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
     * Save data by key. Saves to both localStorage (immediate) and cloud (debounced).
     */
    async save(key, value) {
        // Always save to localStorage immediately
        try {
            const lsKey = this._getLSKey(key);
            localStorage.setItem(lsKey, JSON.stringify(value));
        } catch (error) {
            console.warn(`CloudSync: Error saving to localStorage for key "${key}":`, error);
        }

        // If logged in, also save to cloud (debounced to avoid excessive writes)
        if (this.authManager.isLoggedIn()) {
            this._debouncedCloudSave(key, value);
        }
    }

    /**
     * Force sync all localStorage data to cloud (useful after login)
     */
    async syncToCloud() {
        if (!this.authManager.isLoggedIn()) return;

        try {
            const data = {};
            for (const cloudKey of ALL_CLOUD_KEYS) {
                const lsKey = this._getLSKey(cloudKey);
                const value = localStorage.getItem(lsKey);
                if (value) {
                    try {
                        data[cloudKey] = JSON.parse(value);
                    } catch {
                        data[cloudKey] = value;
                    }
                }
            }

            if (Object.keys(data).length > 0) {
                await apiClient.syncToCloud(data);
                console.log('All data synced to cloud');
            }
        } catch (error) {
            console.error('CloudSync: Error syncing to cloud:', error);
        }
    }

    /**
     * Pull all data from cloud and update localStorage
     */
    async syncFromCloud() {
        if (!this.authManager.isLoggedIn()) return false;

        try {
            const data = await apiClient.syncFromCloud();

            if (data && Object.keys(data).length > 0) {
                for (const [cloudKey, lsKey] of Object.entries(KEY_MAP)) {
                    if (data[cloudKey] !== undefined) {
                        localStorage.setItem(lsKey, JSON.stringify(data[cloudKey]));
                    }
                }
                console.log('Data pulled from cloud');
                return true;
            }
            return false;
        } catch (error) {
            console.error('CloudSync: Error pulling from cloud:', error);
            return false;
        }
    }

    // --- Private helpers ---

    _debouncedCloudSave(key, value) {
        if (this._debounceTimers[key]) {
            clearTimeout(this._debounceTimers[key]);
        }

        this._debounceTimers[key] = setTimeout(async () => {
            try {
                await apiClient.syncKey(key, value);
            } catch (error) {
                console.warn(`CloudSync: Error saving "${key}" to cloud:`, error);
            }
        }, 2000);
    }

    _getLSKey(key) {
        return KEY_MAP[key] || key;
    }
}

export { CloudSync };
