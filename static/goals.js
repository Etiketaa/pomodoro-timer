/**
 * Daily Goals System for Pomodoro Timer v2
 * Set daily pomodoro targets, track progress, celebrate completion
 */

class DailyGoal {
    constructor() {
        this.goal = this._load();
        this.container = null;
        this._init();
    }

    _init() {
        this.container = document.getElementById('daily-goal-widget');
        if (!this.container) return;
        this._render();
        this._bindEvents();
    }

    _load() {
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroDailyGoal')) || {};
            const today = new Date().toISOString().slice(0, 10);
            // Reset progress if it's a new day
            if (saved.date !== today) {
                return { target: saved.target || 8, completed: 0, date: today, celebrated: false };
            }
            return saved;
        } catch {
            return { target: 8, completed: 0, date: new Date().toISOString().slice(0, 10), celebrated: false };
        }
    }

    _save() {
        localStorage.setItem('pomodoroDailyGoal', JSON.stringify(this.goal));
        // Sync to cloud if available
        if (window.PomodoroV2?.cloudSync) {
            window.PomodoroV2.cloudSync.save('dailyGoal', this.goal);
        }
    }

    _render() {
        if (!this.container) return;

        const progress = this.goal.target > 0 ? Math.min(this.goal.completed / this.goal.target, 1) : 0;
        const percentage = Math.round(progress * 100);
        const remaining = Math.max(0, this.goal.target - this.goal.completed);

        this.container.innerHTML = `
            <div class="goal-header">
                <span class="goal-title">🎯 Meta Diaria</span>
                <div class="goal-edit">
                    <button id="goal-decrease-btn" class="goal-adjust-btn" aria-label="Disminuir meta">−</button>
                    <span class="goal-target-display">${this.goal.target}</span>
                    <button id="goal-increase-btn" class="goal-adjust-btn" aria-label="Aumentar meta">+</button>
                </div>
            </div>
            <div class="goal-progress-container">
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="goal-progress-text">${this.goal.completed}/${this.goal.target}</span>
            </div>
            <p class="goal-status-text">${this._getStatusText(remaining, progress)}</p>
        `;
    }

    _getStatusText(remaining, progress) {
        if (progress >= 1) return '🎉 ¡Meta alcanzada! ¡Sos un crack!';
        if (progress >= 0.75) return `🔥 ¡Ya casi! Solo ${remaining} más`;
        if (progress >= 0.5) return `💪 ¡Más de la mitad! Faltan ${remaining}`;
        if (progress > 0) return `☕ Buen comienzo. Faltan ${remaining}`;
        return `🚀 ¡Arrancá! Objetivo: ${this.goal.target} pomodoros`;
    }

    _bindEvents() {
        this.container?.querySelector('#goal-increase-btn')?.addEventListener('click', () => {
            this.goal.target = Math.min(this.goal.target + 1, 20);
            this._save();
            this._render();
            this._bindEvents();
        });

        this.container?.querySelector('#goal-decrease-btn')?.addEventListener('click', () => {
            this.goal.target = Math.max(this.goal.target - 1, 1);
            this._save();
            this._render();
            this._bindEvents();
        });
    }

    /**
     * Call this when a pomodoro is completed
     */
    recordPomodoro() {
        const today = new Date().toISOString().slice(0, 10);
        if (this.goal.date !== today) {
            this.goal = { target: this.goal.target, completed: 0, date: today, celebrated: false };
        }

        this.goal.completed++;
        this._save();
        this._render();
        this._bindEvents();

        // Check if goal was just achieved
        if (this.goal.completed >= this.goal.target && !this.goal.celebrated) {
            this.goal.celebrated = true;
            this._save();
            this._celebrate();
        }
    }

    _celebrate() {
        if (window.Toast) {
            Toast.show('🎉 ¡Meta diaria alcanzada! ¡Felicitaciones!', 'success', 5000);
        }
        this._launchConfetti();
    }

    _launchConfetti() {
        const canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#f97316', '#10b981', '#6366f1', '#f43f5e', '#eab308', '#3b82f6', '#ec4899'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        let frame = 0;
        const maxFrames = 180; // ~3 seconds at 60fps

        function animate() {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // gravity
                p.rotation += p.rotSpeed;

                if (frame > maxFrames - 60) {
                    p.opacity = Math.max(0, p.opacity - 0.02);
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            if (frame < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        }

        requestAnimationFrame(animate);
    }
}

// Make globally available
window.DailyGoal = DailyGoal;
