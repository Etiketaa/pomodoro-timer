/**
 * App Initializer for Pomodoro Timer v2
 * Initializes Firebase Auth, CloudSync, and new UI components
 * This runs as a module after other scripts are loaded
 */

import { AuthManager, AuthModalController } from './auth.js';
import { CloudSync } from './cloud-sync.js';
import { UserChat } from './user-chat.js';

// Initialize Auth and Cloud Sync
const authManager = new AuthManager();
const authModal = new AuthModalController(authManager);
const cloudSync = new CloudSync(authManager);
const userChat = new UserChat();

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
let hasSynced = false;
authManager.onAuthChange(async (user) => {
    if (user && !hasSynced) {
        hasSynced = true;
        // Pull data from cloud on login
        const pulled = await cloudSync.syncFromCloud();
        if (pulled) {
            Toast.show('Datos sincronizados desde la nube ☁️', 'success');
            // Dispatch event so script.js can refresh its state without full reload
            window.dispatchEvent(new CustomEvent('pomodoroDataSynced'));
        } else {
            // First login: push local data to cloud
            await cloudSync.syncToCloud();
            Toast.show(`¡Bienvenido, ${user.displayName || user.email.split('@')[0]}! 🎉`, 'success');
        }
    } else if (!user) {
        hasSynced = false;
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
    userChat,
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
