/**
 * User Profile System for Pomodoro Timer v2
 * XP, Levels, Badges, Stats tracking, and editable profile
 */

class UserProfile {
    constructor() {
        this.data = this._load();
        this.LEVELS = [
            { level: 1, xpRequired: 0, name: '🌱 Semilla', color: '#86efac' },
            { level: 2, xpRequired: 100, name: '🌿 Brote', color: '#4ade80' },
            { level: 3, xpRequired: 250, name: '🌳 Árbol', color: '#22c55e' },
            { level: 4, xpRequired: 500, name: '🔥 Fuego', color: '#f97316' },
            { level: 5, xpRequired: 1000, name: '⭐ Estrella', color: '#eab308' },
            { level: 6, xpRequired: 2000, name: '🏔️ Montaña', color: '#6366f1' },
            { level: 7, xpRequired: 5000, name: '🚀 Leyenda', color: '#ec4899' }
        ];

        this.BADGES = [
            { id: 'first_pomo', name: '🎯 Primer Pomodoro', desc: 'Completá tu primer pomodoro', check: (d) => d.totalPomodoros >= 1 },
            { id: 'streak_3', name: '🔥 En Racha', desc: '3 días consecutivos', check: (d) => d.currentStreak >= 3 },
            { id: 'marathon', name: '💪 Maratón', desc: '10 pomodoros en un día', check: (d) => d.bestDayCount >= 10 },
            { id: 'centurion', name: '🏆 Centurión', desc: '100 pomodoros totales', check: (d) => d.totalPomodoros >= 100 },
            { id: 'perfect_week', name: '👑 Semana Perfecta', desc: '7 días consecutivos', check: (d) => d.currentStreak >= 7 },
            { id: 'level_3', name: '🌳 Crecimiento', desc: 'Alcanzá el nivel 3', check: (d) => this.getLevel(d.xp).level >= 3 },
            { id: 'level_5', name: '⭐ Brillante', desc: 'Alcanzá el nivel 5', check: (d) => this.getLevel(d.xp).level >= 5 },
            { id: 'fifty_pomo', name: '🎖️ Veterano', desc: '50 pomodoros totales', check: (d) => d.totalPomodoros >= 50 },
            { id: 'streak_14', name: '💎 Imparable', desc: '14 días consecutivos', check: (d) => d.currentStreak >= 14 },
        ];

        this.AVATARS = ['🍅', '🎯', '🔥', '⭐', '🚀', '🌸', '🎮', '🎵', '☕', '🌊', '🐱', '🦊', '🐻', '🦉', '🐸', '🌈'];
    }

    _load() {
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroUserProfile')) || {};
            return {
                displayName: saved.displayName || '',
                avatar: saved.avatar || '🍅',
                xp: saved.xp || 0,
                totalPomodoros: saved.totalPomodoros || 0,
                currentStreak: saved.currentStreak || 0,
                bestStreak: saved.bestStreak || 0,
                bestDayCount: saved.bestDayCount || 0,
                lastActiveDate: saved.lastActiveDate || null,
                todayCount: saved.todayCount || 0,
                unlockedBadges: saved.unlockedBadges || [],
                activeDays: saved.activeDays || 0,
                joinedDate: saved.joinedDate || new Date().toISOString().slice(0, 10)
            };
        } catch {
            return this._defaults();
        }
    }

    _defaults() {
        return {
            displayName: '', avatar: '🍅', xp: 0, totalPomodoros: 0,
            currentStreak: 0, bestStreak: 0, bestDayCount: 0,
            lastActiveDate: null, todayCount: 0, unlockedBadges: [],
            activeDays: 0, joinedDate: new Date().toISOString().slice(0, 10)
        };
    }

    _save() {
        localStorage.setItem('pomodoroUserProfile', JSON.stringify(this.data));
        if (window.PomodoroV2?.cloudSync) {
            window.PomodoroV2.cloudSync.save('userProfile', this.data);
        }
    }

    /**
     * Add XP and update stats when a pomodoro is completed
     */
    addXP(amount = 25) {
        const today = new Date().toISOString().slice(0, 10);
        const prevLevel = this.getLevel(this.data.xp);

        // Update XP and pomodoro count
        this.data.xp += amount;
        this.data.totalPomodoros++;
        this.data.todayCount++;

        // Update best day
        if (this.data.todayCount > this.data.bestDayCount) {
            this.data.bestDayCount = this.data.todayCount;
        }

        // Update streak
        if (this.data.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);

            if (this.data.lastActiveDate === yesterdayStr) {
                this.data.currentStreak++;
            } else if (this.data.lastActiveDate !== today) {
                this.data.currentStreak = 1;
            }

            this.data.todayCount = 1; // Reset today counter on new day
            this.data.activeDays++;
            this.data.lastActiveDate = today;
        }

        // Update best streak
        if (this.data.currentStreak > this.data.bestStreak) {
            this.data.bestStreak = this.data.currentStreak;
        }

        this._save();

        // Check for level up
        const newLevel = this.getLevel(this.data.xp);
        if (newLevel.level > prevLevel.level) {
            this._onLevelUp(newLevel);
        }

        // Check for new badges
        this._checkBadges();

        return { xpGained: amount, newTotal: this.data.xp, level: newLevel };
    }

    getLevel(xp) {
        let current = this.LEVELS[0];
        for (const level of this.LEVELS) {
            if (xp >= level.xpRequired) {
                current = level;
            } else {
                break;
            }
        }
        return current;
    }

    getNextLevel(xp) {
        const current = this.getLevel(xp);
        return this.LEVELS.find(l => l.level === current.level + 1) || null;
    }

    getXPProgress() {
        const current = this.getLevel(this.data.xp);
        const next = this.getNextLevel(this.data.xp);
        if (!next) return { progress: 1, currentXP: this.data.xp, needed: 0 };

        const xpInLevel = this.data.xp - current.xpRequired;
        const xpForNext = next.xpRequired - current.xpRequired;
        return {
            progress: xpInLevel / xpForNext,
            currentXP: xpInLevel,
            needed: xpForNext
        };
    }

    _onLevelUp(newLevel) {
        if (window.Toast) {
            Toast.show(`🎉 ¡Subiste al nivel ${newLevel.level}! ${newLevel.name}`, 'success', 5000);
        }
    }

    _checkBadges() {
        let newBadge = false;
        this.BADGES.forEach(badge => {
            if (!this.data.unlockedBadges.includes(badge.id) && badge.check(this.data)) {
                this.data.unlockedBadges.push(badge.id);
                newBadge = true;
                if (window.Toast) {
                    Toast.show(`🏅 Badge desbloqueado: ${badge.name}`, 'success', 4000);
                }
            }
        });
        if (newBadge) this._save();
    }

    setAvatar(emoji) {
        this.data.avatar = emoji;
        this._save();
    }

    setDisplayName(name) {
        this.data.displayName = name;
        this._save();
    }

    getUserId() {
        if (window.PomodoroV2?.authManager) {
            return window.PomodoroV2.authManager.getUserId();
        }
        return null;
    }

    getShortId() {
        const uid = this.getUserId();
        return uid ? uid.substring(0, 8).toUpperCase() : null;
    }

    async getFriendCode() {
        const uid = this.getUserId();
        if (!uid) return null;
        try {
            const { db, doc, getDoc } = await import('./firebase-config.js');
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (snap.exists() && snap.data().friendCode) {
                return snap.data().friendCode;
            }
        } catch (e) {
            console.warn('Could not get friend code:', e);
        }
        return this.getShortId();
    }

    /**
     * Render the profile modal content
     */
    renderProfileModal(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const level = this.getLevel(this.data.xp);
        const next = this.getNextLevel(this.data.xp);
        const xpProgress = this.getXPProgress();
        const shortId = this.getShortId();

        const authUser = window.PomodoroV2?.authManager?.currentUser;
        const displayName = this.data.displayName || authUser?.displayName || authUser?.email?.split('@')[0] || 'Usuario';

        // Build badges HTML
        let badgesHtml = '';
        this.BADGES.forEach(badge => {
            const unlocked = this.data.unlockedBadges.includes(badge.id);
            badgesHtml += `
                <div class="badge-item ${unlocked ? 'unlocked' : 'locked'}" title="${badge.desc}">
                    <span class="badge-icon">${unlocked ? badge.name.split(' ')[0] : '🔒'}</span>
                    <span class="badge-label">${badge.name.split(' ').slice(1).join(' ')}</span>
                </div>
            `;
        });

        // Build avatar selector
        let avatarHtml = '';
        this.AVATARS.forEach(emoji => {
            avatarHtml += `
                <button class="avatar-option ${this.data.avatar === emoji ? 'selected' : ''}" 
                    data-avatar="${emoji}" title="Elegir ${emoji}">${emoji}</button>
            `;
        });

        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar-large">${this.data.avatar}</div>
                <div class="profile-info">
                    <div class="profile-name-row">
                        <input type="text" id="profile-name-input" class="profile-name-input" 
                            value="${displayName}" placeholder="Tu nombre" maxlength="20">
                    </div>
                    <div class="profile-level" style="color: ${level.color}">
                        ${level.name} • Nivel ${level.level}
                    </div>
                    ${shortId ? `<div class="profile-friend-code">
                        <span class="friend-code-label">Tu código de amigo:</span>
                        <div class="friend-code-badge">
                            <span id="profile-friend-code" class="friend-code-value">Cargando...</span>
                            <button id="copy-friend-code-btn" class="copy-uid-btn" title="Copiar código">📋</button>
                            <button id="share-friend-code-btn" class="copy-uid-btn" title="Compartir código">📤</button>
                        </div>
                        <span class="friend-code-hint">Compartí este código para que te agreguen</span>
                    </div>` : ''}
                </div>
            </div>

            <div class="profile-xp-section">
                <div class="xp-bar-container">
                    <div class="xp-bar-fill" style="width: ${xpProgress.progress * 100}%; background: ${level.color}"></div>
                </div>
                <div class="xp-bar-text">
                    ${this.data.xp} XP total ${next ? `• ${xpProgress.currentXP}/${xpProgress.needed} para nivel ${next.level}` : '• ¡Nivel máximo!'}
                </div>
            </div>

            <div class="profile-stats-grid">
                <div class="profile-stat-card">
                    <span class="profile-stat-value">${this.data.totalPomodoros}</span>
                    <span class="profile-stat-label">Pomodoros</span>
                </div>
                <div class="profile-stat-card">
                    <span class="profile-stat-value">${this.data.currentStreak}🔥</span>
                    <span class="profile-stat-label">Racha</span>
                </div>
                <div class="profile-stat-card">
                    <span class="profile-stat-value">${this.data.bestStreak}</span>
                    <span class="profile-stat-label">Mejor Racha</span>
                </div>
                <div class="profile-stat-card">
                    <span class="profile-stat-value">${this.data.activeDays}</span>
                    <span class="profile-stat-label">Días Activos</span>
                </div>
            </div>

            <h4 class="profile-section-title">🏅 Logros (${this.data.unlockedBadges.length}/${this.BADGES.length})</h4>
            <div class="badges-grid">${badgesHtml}</div>

            <h4 class="profile-section-title">😊 Avatar</h4>
            <div class="avatar-selector">${avatarHtml}</div>

            ${window.CryptoChat ? `<div class="profile-crypto-section">
                <h4 class="profile-section-title">🔐 Encriptación E2E</h4>
                <p class="profile-crypto-info">Tus mensajes están encriptados de extremo a extremo.</p>
                <div class="profile-fingerprint">
                    <span class="fingerprint-label">🗂️ Fingerprint de tu clave:</span>
                    <code id="profile-key-fingerprint" class="fingerprint-value">Cargando...</code>
                    <span class="fingerprint-hint">Compará este código con tu contacto para verificar identidad</span>
                </div>
                <div class="profile-crypto-actions">
                    <button id="backup-key-btn" class="profile-backup-btn">💾 Backup de clave</button>
                    <button id="rotate-key-btn" class="profile-rotate-btn">🔄 Rotar claves</button>
                </div>
            </div>` : ''}
        `;

        this._bindProfileEvents(container);

        // Load friend code & fingerprint async
        this.getFriendCode().then(code => {
            const codeEl = container.querySelector('#profile-friend-code');
            if (codeEl && code) codeEl.textContent = code;
        });

        // Load key fingerprint async
        if (window.CryptoChat) {
            this._loadKeyFingerprint(container);
        }
    }

    async _loadKeyFingerprint(container) {
        try {
            const uid = this.getUserId();
            if (!uid) return;
            const { db, doc, getDoc } = await import('./firebase-config.js');
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (snap.exists() && snap.data().publicKey) {
                const cryptoChat = new CryptoChat();
                const fingerprint = await cryptoChat.getKeyFingerprint(snap.data().publicKey);
                const fpEl = container.querySelector('#profile-key-fingerprint');
                if (fpEl && fingerprint) fpEl.textContent = fingerprint;
            }
        } catch (e) {
            console.warn('Could not load fingerprint:', e);
        }
    }

    _bindProfileEvents(container) {
        // Name edit
        const nameInput = container.querySelector('#profile-name-input');
        nameInput?.addEventListener('change', (e) => {
            this.setDisplayName(e.target.value.trim());
            if (window.Toast) Toast.show('Nombre actualizado ✅', 'success', 2000);
        });

        // Avatar selection
        container.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emoji = e.target.dataset.avatar;
                this.setAvatar(emoji);
                container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                container.querySelector('.profile-avatar-large').textContent = emoji;
                if (window.Toast) Toast.show(`Avatar cambiado a ${emoji}`, 'info', 2000);
            });
        });

        // Copy friend code
        container.querySelector('#copy-friend-code-btn')?.addEventListener('click', async () => {
            const codeEl = container.querySelector('#profile-friend-code');
            const code = codeEl?.textContent;
            if (code && code !== 'Cargando...') {
                await navigator.clipboard.writeText(code);
                if (window.Toast) Toast.show('Código copiado al portapapeles 📋', 'success', 2000);
            }
        });

        // Share friend code (Web Share API)
        container.querySelector('#share-friend-code-btn')?.addEventListener('click', async () => {
            const codeEl = container.querySelector('#profile-friend-code');
            const code = codeEl?.textContent;
            if (!code || code === 'Cargando...') return;

            const shareText = `¡Agregame en Pomodoro Timer! Mi código de amigo es: ${code}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: 'Pomodoro Timer', text: shareText });
                } catch (e) {
                    if (e.name !== 'AbortError') console.warn('Share failed:', e);
                }
            } else {
                await navigator.clipboard.writeText(code);
                if (window.Toast) Toast.show('Código copiado 📋', 'success', 2000);
            }
        });

        // Backup encryption key
        container.querySelector('#backup-key-btn')?.addEventListener('click', async () => {
            const uid = this.getUserId();
            if (uid && window.CryptoChat) {
                try {
                    const crypto = new CryptoChat();
                    await crypto.exportKeyBackup(uid);
                    if (window.Toast) Toast.show('Clave exportada — guardala en un lugar seguro 🔐', 'success', 4000);
                } catch (e) {
                    if (window.Toast) Toast.show('No se pudo exportar la clave', 'error');
                }
            }
        });

        // Rotate encryption keys
        container.querySelector('#rotate-key-btn')?.addEventListener('click', async () => {
            const uid = this.getUserId();
            if (!uid || !window.CryptoChat) return;

            const confirmed = confirm(
                '⚠️ ¿Rotar tus claves de encriptación?\n\n' +
                'Esto generará un nuevo par de claves. Los mensajes anteriores seguirán siendo legibles, ' +
                'pero tus contactos necesitarán la nueva clave pública (se actualiza automáticamente).\n\n' +
                '¿Continuar?'
            );
            if (!confirmed) return;

            try {
                const cryptoChat = new CryptoChat();
                const newPublicKeyJwk = await cryptoChat.regenerateKeys(uid);

                // Update Firestore with new public key
                const { db, doc, setDoc } = await import('./firebase-config.js');
                await setDoc(doc(db, 'users', uid), { publicKey: newPublicKeyJwk }, { merge: true });

                // Refresh fingerprint
                const fingerprint = await cryptoChat.getKeyFingerprint(newPublicKeyJwk);
                const fpEl = container.querySelector('#profile-key-fingerprint');
                if (fpEl && fingerprint) fpEl.textContent = fingerprint;

                if (window.Toast) Toast.show('🔑 Claves rotadas exitosamente', 'success', 4000);
            } catch (e) {
                console.error('Key rotation failed:', e);
                if (window.Toast) Toast.show('Error al rotar claves', 'error');
            }
        });
    }
}

window.UserProfile = UserProfile;
