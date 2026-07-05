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

        this.presets = {
            rainyCafe: { name: '☕ Lluvia + Café', sounds: { rain: 60, cafe: 40 } },
            forestNight: { name: '🌲 Bosque Noche', sounds: { forest: 70, thunder: 20 } },
            oceanChill: { name: '🌊 Oceano Relax', sounds: { waves: 60, fireplace: 30 } },
            studyMode: { name: '📚 Estudio Profundo', sounds: { rain: 40, fireplace: 30, cafe: 20 } },
            stormLounge: { name: '⛈️ Tormenta Lounge', sounds: { thunder: 50, rain: 40, fireplace: 20 } },
            natureMix: { name: '🌿 Naturaleza Total', sounds: { forest: 50, waves: 30, rain: 20 } }
        };

        this.isOpen = false;
        this._loadSavedState();
        this._createUI();
    }

    _addStyles() {
        if (document.getElementById('ambient-presets-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ambient-presets-styles';
        styles.textContent = `
            .ambient-presets {
                padding: 8px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .presets-label {
                font-size: 0.75rem;
                color: var(--text-color, #fff);
                opacity: 0.6;
                display: block;
                margin-bottom: 6px;
            }

            .presets-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .ambient-preset-btn {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-color, #fff);
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ambient-preset-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: var(--primary-color, #f97316);
            }

            .ambient-preset-btn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(styles);
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

        let presetsHtml = '';
        Object.entries(this.presets).forEach(([key, preset]) => {
            presetsHtml += `
                <button class="ambient-preset-btn" data-preset="${key}">${preset.name}</button>
            `;
        });

        panel.innerHTML = `
            <div class="ambient-mixer-header">
                <span>🎧 Sonidos Ambientales</span>
                <button id="ambient-reset-btn" class="ambient-reset-btn" title="Reset todo">🔄</button>
            </div>
            <div class="ambient-presets">
                <span class="presets-label">Presets:</span>
                <div class="presets-grid">
                    ${presetsHtml}
                </div>
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

        // Preset buttons
        panel.querySelectorAll('.ambient-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetKey = e.target.dataset.preset;
                this._applyPreset(presetKey);
            });
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

    _applyPreset(presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) return;

        // Reset all first
        Object.keys(this.sounds).forEach(key => {
            this._setVolume(key, 0);
        });

        // Apply preset volumes
        Object.entries(preset.sounds).forEach(([key, volume]) => {
            this._setVolume(key, volume);
        });

        // Update UI sliders
        this.panel.querySelectorAll('.ambient-slider').forEach(slider => {
            const key = slider.dataset.sound;
            const vol = this.sounds[key]?.volume || 0;
            slider.value = vol;
            const label = slider.parentElement.querySelector('.ambient-volume-value');
            label.textContent = vol > 0 ? vol + '%' : 'OFF';
        });

        if (window.Toast) Toast.show(`🎧 Preset: ${preset.name}`, 'success');
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
