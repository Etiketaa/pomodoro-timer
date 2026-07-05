/**
 * Focus Mode for Pomodoro Timer
 * Hides non-essential UI elements during work sessions
 */

class FocusMode {
    constructor() {
        this.isEnabled = false;
        this.elementsToHide = [
            '#weather-widget',
            '#companions-widget',
            '#daily-goal-widget',
            '.shortcuts-hint',
            '#current-task-display',
            '.task-columns-tablet-group',
            '.misc-widgets-tablet-group'
        ];

        this._createUI();
        this._loadState();
    }

    _createUI() {
        // Create focus toggle button
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.id = 'focus-mode-btn';
        this.toggleBtn.className = 'icon-btn focus-mode-btn';
        this.toggleBtn.setAttribute('aria-label', 'Modo Focus');
        this.toggleBtn.title = 'Modo Focus - Ocultar elementos innecesarios';
        this.toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
            </svg>
        `;

        // Insert in navbar (before accordion toggle)
        const accordionToggle = document.getElementById('accordion-toggle');
        if (accordionToggle) {
            accordionToggle.parentNode.insertBefore(this.toggleBtn, accordionToggle);
        }

        // Bind event
        this.toggleBtn.addEventListener('click', () => this.toggle());

        // Add styles
        this._addStyles();
    }

    _addStyles() {
        if (document.getElementById('focus-mode-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'focus-mode-styles';
        styles.textContent = `
            .focus-mode-btn {
                position: relative;
            }

            .focus-mode-btn.active {
                color: #10b981;
            }

            .focus-mode-btn.active::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 50%;
                transform: translateX(-50%);
                width: 6px;
                height: 6px;
                background: #10b981;
                border-radius: 50%;
            }

            body.focus-active .focus-hidden {
                opacity: 0;
                pointer-events: none;
                height: 0;
                overflow: hidden;
                margin: 0;
                padding: 0;
                transition: all 0.3s ease;
            }

            body.focus-active #grid-pomodoro-tasks {
                max-width: 400px;
                margin: 0 auto;
            }

            body.focus-active .timer-container {
                padding: 1rem;
            }

            body.focus-active #main-navbar {
                opacity: 0.3;
                transition: opacity 0.3s ease;
            }

            body.focus-active #main-navbar:hover {
                opacity: 1;
            }

            body.focus-active .chatbox {
                opacity: 0.3;
                transition: opacity 0.3s ease;
            }

            body.focus-active .chatbox:hover {
                opacity: 1;
            }

            body.focus-active #pwa-install-banner {
                display: none;
            }

            .focus-badge {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9));
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                z-index: 999;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            .focus-badge:hover {
                transform: translateX(-50%) translateY(-2px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
            }

            .focus-badge.hidden {
                display: none;
            }

            @media (max-width: 768px) {
                body.focus-active #grid-pomodoro-tasks {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(styles);

        // Create focus badge
        this.badge = document.createElement('div');
        this.badge.className = 'focus-badge hidden';
        this.badge.textContent = '🎯 Modo Focus activo - Click para salir';
        this.badge.addEventListener('click', () => this.toggle());
        document.body.appendChild(this.badge);
    }

    _loadState() {
        try {
            const saved = localStorage.getItem('pomodoroFocusMode');
            if (saved === 'true') {
                this.enable();
            }
        } catch { /* ignore */ }
    }

    _saveState() {
        localStorage.setItem('pomodoroFocusMode', this.isEnabled);
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    enable() {
        this.isEnabled = true;
        document.body.classList.add('focus-active');
        this.toggleBtn.classList.add('active');
        this.badge.classList.remove('hidden');

        // Hide elements
        this.elementsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('focus-hidden');
            });
        });

        this._saveState();

        if (window.Toast) {
            Toast.show('🎯 Modo Focus activado', 'info');
        }
    }

    disable() {
        this.isEnabled = false;
        document.body.classList.remove('focus-active');
        this.toggleBtn.classList.remove('active');
        this.badge.classList.add('hidden');

        // Show elements
        this.elementsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('focus-hidden');
            });
        });

        this._saveState();

        if (window.Toast) {
            Toast.show('Modo Focus desactivado', 'info');
        }
    }
}

window.FocusMode = FocusMode;
