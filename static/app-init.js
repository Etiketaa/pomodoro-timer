/**
 * App Initializer for Pomodoro Timer v2
 * Initializes Firebase Auth, CloudSync, and new UI components
 * This runs as a module after other scripts are loaded
 */

import { AuthManager, AuthModalController } from './auth.js';
import { CloudSync } from './cloud-sync.js';

// Initialize Auth and Cloud Sync
const authManager = new AuthManager();
const authModal = new AuthModalController(authManager);
const cloudSync = new CloudSync(authManager);

// Initialize Circular Progress
let circularProgress = null;
if (document.getElementById('circular-progress-container')) {
    circularProgress = new CircularProgress('circular-progress-container');
    circularProgress.setMode('pomodoro');
}

// Update session dots based on pomodoro count
function updateSessionDots(pomodorosInCycle) {
    const dots = document.querySelectorAll('.session-dot');
    const currentInCycle = pomodorosInCycle % 4;

    dots.forEach((dot, i) => {
        dot.classList.remove('completed', 'current');
        if (i < currentInCycle) {
            dot.classList.add('completed');
        } else if (i === currentInCycle) {
            dot.classList.add('current');
        }
    });
}

// Listen for auth state changes to sync data
authManager.onAuthChange(async (user) => {
    if (user) {
        // Pull data from cloud on login
        const pulled = await cloudSync.syncFromCloud();
        if (pulled) {
            Toast.show('Datos sincronizados desde la nube ☁️', 'success');
            // Reload the app state
            window.location.reload();
        } else {
            // First login: push local data to cloud
            await cloudSync.syncToCloud();
            Toast.show(`¡Bienvenido, ${user.displayName || user.email.split('@')[0]}! 🎉`, 'success');
        }
    }
});

// Sync button handler
document.getElementById('sync-btn')?.addEventListener('click', async () => {
    Toast.show('Sincronizando...', 'info', 2000);
    await cloudSync.syncToCloud();
    Toast.show('Datos sincronizados ✅', 'success');
    document.getElementById('user-menu')?.classList.add('hidden');
});

// Expose utilities to the global scope for script.js integration
window.PomodoroV2 = {
    authManager,
    cloudSync,
    circularProgress,
    updateSessionDots,

    /** Update circular progress based on timer state */
    updateProgress(remainingTime, totalTime) {
        if (circularProgress && totalTime > 0) {
            const progress = 1 - (remainingTime / totalTime);
            circularProgress.update(progress);
        }
    },

    /** Set progress ring color based on mode */
    setMode(mode) {
        if (circularProgress) {
            circularProgress.setMode(mode);
        }
    }
};

console.log('✅ Pomodoro Timer v2 initialized');
