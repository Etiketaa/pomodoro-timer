/**
 * Ambient Sound Mixer for Pomodoro Timer v2
 * Mix multiple ambient sounds with individual volume controls
 * Uses short audio loops loaded on-demand
 */

class AmbientSoundMixer {
    constructor() {
        this.sounds = {
            rain: {
                name: '🌧️ Lluvia',
                url: 'https://cdn.freesound.org/previews/243/243627_1038806-lq.mp3',
                audio: null,
                volume: 0
            },
            cafe: {
                name: '☕ Café',
                url: 'https://cdn.freesound.org/previews/424/424381_4862957-lq.mp3',
                audio: null,
                volume: 0
            },
            forest: {
                name: '🌲 Bosque',
                url: 'https://cdn.freesound.org/previews/400/400855_7236690-lq.mp3',
                audio: null,
                volume: 0
            },
            waves: {
                name: '🌊 Olas',
                url: 'https://cdn.freesound.org/previews/467/467539_6769498-lq.mp3',
                audio: null,
                volume: 0
            },
            fireplace: {
                name: '🔥 Fogata',
                url: 'https://cdn.freesound.org/previews/261/261887_4672584-lq.mp3',
                audio: null,
                volume: 0
            },
            thunder: {
                name: '⛈️ Tormenta',
                url: 'https://cdn.freesound.org/previews/360/360328_6615528-lq.mp3',
                audio: null,
                volume: 0
            }
        };

        this.isOpen = false;
        this._loadSavedState();
        this._createUI();
    }

    _loadSavedState() {
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroAmbientSounds')) || {};
            Object.keys(saved).forEach(key => {
                if (this.sounds[key]) {
                    this.sounds[key].volume = saved[key] || 0;
                }
            });
        } catch { /* ignore */ }
    }

    _saveState() {
        const state = {};
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (sound.volume > 0) state[key] = sound.volume;
        });
        localStorage.setItem('pomodoroAmbientSounds', JSON.stringify(state));
    }

    _createUI() {
        // Create the mixer panel
        const panel = document.createElement('div');
        panel.id = 'ambient-mixer-panel';
        panel.className = 'ambient-mixer-panel hidden';

        let soundsHtml = '';
        Object.entries(this.sounds).forEach(([key, sound]) => {
            soundsHtml += `
                <div class="ambient-sound-row" data-sound="${key}">
                    <span class="ambient-sound-name">${sound.name}</span>
                    <input type="range" class="ambient-slider" 
                        data-sound="${key}" 
                        min="0" max="100" value="${sound.volume}" 
                        aria-label="${sound.name} volumen">
                    <span class="ambient-volume-value">${sound.volume > 0 ? sound.volume + '%' : 'OFF'}</span>
                </div>
            `;
        });

        panel.innerHTML = `
            <div class="ambient-mixer-header">
                <span>🎧 Sonidos Ambientales</span>
                <button id="ambient-reset-btn" class="ambient-reset-btn" title="Reset todo">🔄</button>
            </div>
            <div class="ambient-mixer-body">
                ${soundsHtml}
            </div>
        `;

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'ambient-toggle-btn';
        toggleBtn.className = 'icon-btn ambient-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Sonidos Ambientales');
        toggleBtn.title = 'Sonidos ambientales';
        toggleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
        `;

        // Insert in navbar (before accordion toggle)
        const accordionToggle = document.getElementById('accordion-toggle');
        if (accordionToggle) {
            accordionToggle.parentNode.insertBefore(toggleBtn, accordionToggle);
            accordionToggle.parentNode.insertBefore(panel, accordionToggle);
        }

        // Bind events
        toggleBtn.addEventListener('click', () => this._togglePanel());

        panel.querySelectorAll('.ambient-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const key = e.target.dataset.sound;
                const vol = parseInt(e.target.value);
                this._setVolume(key, vol);
                const label = e.target.parentElement.querySelector('.ambient-volume-value');
                label.textContent = vol > 0 ? vol + '%' : 'OFF';
            });
        });

        document.getElementById('ambient-reset-btn')?.addEventListener('click', () => {
            this._resetAll();
        });

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen &&
                !panel.contains(e.target) &&
                !toggleBtn.contains(e.target)) {
                this._togglePanel(false);
            }
        });

        // Auto-play saved sounds
        Object.entries(this.sounds).forEach(([key, sound]) => {
            if (sound.volume > 0) {
                // Defer to avoid autoplay restrictions, will play on first user interaction
                this._pendingAutoplay = this._pendingAutoplay || [];
                this._pendingAutoplay.push({ key, volume: sound.volume });
            }
        });

        // Play saved sounds on first user interaction
        if (this._pendingAutoplay?.length > 0) {
            const playPending = () => {
                this._pendingAutoplay?.forEach(({ key, volume }) => {
                    this._setVolume(key, volume);
                });
                this._pendingAutoplay = null;
                document.removeEventListener('click', playPending);
                document.removeEventListener('keydown', playPending);
            };
            document.addEventListener('click', playPending, { once: true });
            document.addEventListener('keydown', playPending, { once: true });
        }

        this.panel = panel;
        this.toggleBtn = toggleBtn;
    }

    _togglePanel(forceState) {
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.panel.classList.toggle('hidden', !this.isOpen);
        this.toggleBtn.classList.toggle('active', this.isOpen);
    }

    _setVolume(key, volume) {
        const sound = this.sounds[key];
        if (!sound) return;

        sound.volume = volume;

        if (volume > 0) {
            if (!sound.audio) {
                sound.audio = new Audio(sound.url);
                sound.audio.loop = true;
                sound.audio.preload = 'auto';
            }
            sound.audio.volume = volume / 100;
            if (sound.audio.paused) {
                sound.audio.play().catch(e => {
                    console.warn(`Could not play ${key}:`, e);
                });
            }
        } else {
            if (sound.audio && !sound.audio.paused) {
                sound.audio.pause();
            }
        }

        this._saveState();
        this._updateToggleIndicator();
    }

    _resetAll() {
        Object.keys(this.sounds).forEach(key => {
            this._setVolume(key, 0);
        });
        this.panel.querySelectorAll('.ambient-slider').forEach(s => s.value = 0);
        this.panel.querySelectorAll('.ambient-volume-value').forEach(l => l.textContent = 'OFF');

        if (window.Toast) Toast.show('Sonidos ambientales reseteados', 'info');
    }

    _updateToggleIndicator() {
        const anyActive = Object.values(this.sounds).some(s => s.volume > 0);
        this.toggleBtn.classList.toggle('has-active-sounds', anyActive);
    }

    /**
     * Pause all ambient sounds (useful during breaks or alarm)
     */
    pauseAll() {
        Object.values(this.sounds).forEach(sound => {
            if (sound.audio && !sound.audio.paused) {
                sound.audio.pause();
            }
        });
    }

    /**
     * Resume ambient sounds that were previously active
     */
    resumeAll() {
        Object.values(this.sounds).forEach(sound => {
            if (sound.audio && sound.volume > 0) {
                sound.audio.play().catch(() => { });
            }
        });
    }
}

window.AmbientSoundMixer = AmbientSoundMixer;
