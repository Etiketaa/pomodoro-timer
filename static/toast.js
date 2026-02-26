/**
 * Toast Notification System for Pomodoro Timer v2
 * Slide-in toast notifications with auto-dismiss
 */

class Toast {
    static container = null;

    static _ensureContainer() {
        if (!Toast.container) {
            Toast.container = document.createElement('div');
            Toast.container.id = 'toast-container';
            document.body.appendChild(Toast.container);
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {'success'|'info'|'warning'|'error'} type - Toast type
     * @param {number} duration - Duration in ms (default 3500)
     */
    static show(message, type = 'info', duration = 3500) {
        Toast._ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        Toast.container.appendChild(toast);

        // Trigger slide-in animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Animate progress bar
        const progressBar = toast.querySelector('.toast-progress-bar');
        progressBar.style.transition = `width ${duration}ms linear`;
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });

        // Auto dismiss
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 400);
        }, duration);

        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 400);
        });
    }
}

// Make Toast globally available
window.Toast = Toast;
