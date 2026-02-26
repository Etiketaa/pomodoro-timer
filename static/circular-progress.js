/**
 * Circular Progress Ring for Pomodoro Timer v2
 * SVG-based animated circular progress indicator
 */

class CircularProgress {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.radius = 120;
        this.strokeWidth = 8;
        this.normalizedRadius = this.radius - this.strokeWidth;
        this.circumference = 2 * Math.PI * this.normalizedRadius;

        this._createSVG();
    }

    _createSVG() {
        const size = this.radius * 2;
        this.container.innerHTML = `
            <svg class="circular-progress-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color: var(--progress-start, #f97316)"/>
                        <stop offset="100%" style="stop-color: var(--progress-end, #ea580c)"/>
                    </linearGradient>
                    <filter id="progress-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <!-- Background track -->
                <circle
                    class="progress-track"
                    cx="${this.radius}" cy="${this.radius}" r="${this.normalizedRadius}"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    stroke-width="${this.strokeWidth}"
                />
                <!-- Progress ring -->
                <circle
                    class="progress-ring"
                    cx="${this.radius}" cy="${this.radius}" r="${this.normalizedRadius}"
                    fill="none"
                    stroke="url(#progress-gradient)"
                    stroke-width="${this.strokeWidth}"
                    stroke-linecap="round"
                    stroke-dasharray="${this.circumference}"
                    stroke-dashoffset="0"
                    transform="rotate(-90 ${this.radius} ${this.radius})"
                    filter="url(#progress-glow)"
                />
            </svg>
        `;

        this.progressRing = this.container.querySelector('.progress-ring');
    }

    /**
     * Update progress (0 to 1)
     */
    update(progress) {
        if (!this.progressRing) return;
        const offset = this.circumference * (1 - Math.max(0, Math.min(1, progress)));
        this.progressRing.style.strokeDashoffset = offset;
    }

    /**
     * Set colors based on mode
     */
    setMode(mode) {
        const colors = {
            pomodoro: { start: '#f97316', end: '#ea580c' },
            shortBreak: { start: '#10b981', end: '#059669' },
            longBreak: { start: '#6366f1', end: '#4f46e5' }
        };
        const c = colors[mode] || colors.pomodoro;
        this.container.style.setProperty('--progress-start', c.start);
        this.container.style.setProperty('--progress-end', c.end);
    }
}

window.CircularProgress = CircularProgress;
