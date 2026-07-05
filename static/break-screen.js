/**
 * Break Screen for Pomodoro Timer
 * Shows stretching exercises and motivational messages during breaks
 */

class BreakScreen {
    constructor() {
        this.exercises = [
            { name: 'Estiramiento de cuello', duration: 30, icon: '🧘', instruction: 'Girá suavemente la cabeza a la izquierda, mantené 5 seg, y a la derecha. Repetí 3 veces.' },
            { name: 'Rotación de hombros', duration: 30, icon: '💪', instruction: 'Levantá los hombros hacia las orejas, girá hacia atrás y bajá. 10 repeticiones.' },
            { name: 'Estiramiento de muñecas', duration: 25, icon: '🤲', instruction: 'Extendé el brazo, con la otra mano tirá los dedos hacia atrás. 15 seg cada mano.' },
            { name: 'Flexión de espalda', duration: 30, icon: '🧎', instruction: 'Sentate derecho, entrelazá las manos detrás de la cabeza y arqueá la espalda suavemente.' },
            { name: 'Estiramiento de piernas', duration: 35, icon: '🦵', instruction: 'Ponete de pie, extendé una pierna hacia adelante y bajá el torso. 15 seg cada pierna.' },
            { name: 'Respiración profunda', duration: 30, icon: '🌬️', instruction: 'Inhalá por 4 seg, mantené 4 seg, exhalá por 6 seg. Repetí 5 veces.' },
            { name: 'Estiramiento lateral', duration: 25, icon: '🙆', instruction: 'Levantá un brazo y incliná el torso al lado contrario. 15 seg cada lado.' },
            { name: 'Caminata corta', duration: 40, icon: '🚶', instruction: 'Levantate y caminá por el lugar 30 segundos. Mové las piernas y brazos.' },
            { name: 'Masaje de manos', duration: 25, icon: '🤝', instruction: 'Con el pulgar de una mano, masajeá la palma de la otra. circular suavemente.' },
            { name: 'Estiramiento de mandíbula', duration: 20, icon: '😌', instruction: 'Abrí bien la boca, mantené 5 seg, cerrá suavemente. Repetí 5 veces.' }
        ];

        this.motivationalMessages = [
            '¡Excelente trabajo! Merecés un descanso 🎉',
            '¡Pomodoro completado! Estirá un poco 💪',
            '¡Gran foco! Ahora mové el cuerpo 🧘',
            '¡Sos una máquina! Tomate unos minutos ⏸️',
            '¡Así se hace! Despejá la mente un momento 🧠',
            '¡Brillante! Estirá los músculos antes de seguir ✨',
            '¡Cumpliste tu objetivo! Disfrutá del descanso 🌟',
            '¡Fuerza y disciplina! Ahora relajate 💫'
        ];

        this.isActive = false;
        this.currentExercise = null;
        this.timer = null;
        this._createUI();
    }

    _createUI() {
        this.screen = document.createElement('div');
        this.screen.id = 'break-screen';
        this.screen.className = 'break-screen hidden';
        this.screen.innerHTML = `
            <div class="break-content">
                <div class="break-header">
                    <span class="break-emoji">☕</span>
                    <h2 class="break-title">Tiempo de Descanso</h2>
                    <p class="break-motivation"></p>
                </div>
                <div class="break-timer-container">
                    <div class="break-timer-ring">
                        <svg viewBox="0 0 100 100">
                            <circle class="break-ring-bg" cx="50" cy="50" r="45"></circle>
                            <circle class="break-ring-progress" cx="50" cy="50" r="45"></circle>
                        </svg>
                        <span class="break-timer-text">0:00</span>
                    </div>
                </div>
                <div class="break-exercise">
                    <span class="exercise-icon"></span>
                    <h3 class="exercise-name"></h3>
                    <p class="exercise-instruction"></p>
                </div>
                <div class="break-actions">
                    <button id="break-skip-btn" class="break-btn break-skip">Saltar Descanso</button>
                    <button id="break-next-exercise-btn" class="break-btn break-next">Siguiente Ejercicio</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.screen);
        this._addStyles();

        // Bind events
        document.getElementById('break-skip-btn')?.addEventListener('click', () => this.end());
        document.getElementById('break-next-exercise-btn')?.addEventListener('click', () => this._showRandomExercise());
    }

    _addStyles() {
        if (document.getElementById('break-screen-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'break-screen-styles';
        styles.textContent = `
            .break-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: breakFadeIn 0.5s ease-out;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .break-screen.hidden {
                display: none;
            }

            .break-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
            }

            .break-header {
                margin-bottom: 2rem;
            }

            .break-emoji {
                font-size: 4rem;
                display: block;
                margin-bottom: 1rem;
                animation: breakBounce 2s ease-in-out infinite;
            }

            .break-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: #fff;
                margin-bottom: 0.5rem;
            }

            .break-motivation {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.7);
                font-style: italic;
            }

            .break-timer-container {
                margin: 2rem auto;
            }

            .break-timer-ring {
                position: relative;
                width: 150px;
                height: 150px;
                margin: 0 auto;
            }

            .break-timer-ring svg {
                transform: rotate(-90deg);
                width: 100%;
                height: 100%;
            }

            .break-ring-bg {
                fill: none;
                stroke: rgba(255, 255, 255, 0.1);
                stroke-width: 8;
            }

            .break-ring-progress {
                fill: none;
                stroke: #10b981;
                stroke-width: 8;
                stroke-linecap: round;
                stroke-dasharray: 283;
                stroke-dashoffset: 0;
                transition: stroke-dashoffset 1s linear;
            }

            .break-timer-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                font-weight: 700;
                color: #fff;
            }

            .break-exercise {
                margin: 2rem 0;
                padding: 1.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .exercise-icon {
                font-size: 2.5rem;
                display: block;
                margin-bottom: 0.5rem;
            }

            .exercise-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #10b981;
                margin-bottom: 0.5rem;
            }

            .exercise-instruction {
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.5;
            }

            .break-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }

            .break-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .break-skip {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .break-skip:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .break-next {
                background: linear-gradient(135deg, #10b981, #059669);
                color: #fff;
            }

            .break-next:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }

            @keyframes breakFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes breakBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            @media (max-width: 600px) {
                .break-content {
                    padding: 1rem;
                }
                .break-title {
                    font-size: 1.4rem;
                }
                .break-timer-ring {
                    width: 120px;
                    height: 120px;
                }
                .break-actions {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(durationMinutes) {
        this.isActive = true;
        this.screen.classList.remove('hidden');

        // Set motivation
        const motivation = this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];
        this.screen.querySelector('.break-motivation').textContent = motivation;

        // Show random exercise
        this._showRandomExercise();

        // Start timer
        this._startTimer(durationMinutes * 60);
    }

    _showRandomExercise() {
        const exercise = this.exercises[Math.floor(Math.random() * this.exercises.length)];
        this.currentExercise = exercise;

        this.screen.querySelector('.exercise-icon').textContent = exercise.icon;
        this.screen.querySelector('.exercise-name').textContent = exercise.name;
        this.screen.querySelector('.exercise-instruction').textContent = exercise.instruction;

        // Animate
        const exerciseEl = this.screen.querySelector('.break-exercise');
        exerciseEl.style.animation = 'none';
        exerciseEl.offsetHeight; // Trigger reflow
        exerciseEl.style.animation = 'breakFadeIn 0.3s ease-out';
    }

    _startTimer(totalSeconds) {
        let remaining = totalSeconds;
        const timerText = this.screen.querySelector('.break-timer-text');
        const ringProgress = this.screen.querySelector('.break-ring-progress');
        const circumference = 2 * Math.PI * 45;

        const updateTimer = () => {
            const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
            const seconds = (remaining % 60).toString().padStart(2, '0');
            timerText.textContent = `${minutes}:${seconds}`;

            // Update ring
            const progress = (totalSeconds - remaining) / totalSeconds;
            ringProgress.style.strokeDashoffset = circumference * (1 - progress);

            if (remaining <= 0) {
                this.end();
                return;
            }
            remaining--;
        };

        updateTimer();
        this.timer = setInterval(updateTimer, 1000);
    }

    end() {
        this.isActive = false;
        clearInterval(this.timer);
        this.screen.classList.add('hidden');

        // Dispatch event
        window.dispatchEvent(new CustomEvent('breakScreen:end'));
    }
}

window.BreakScreen = BreakScreen;
