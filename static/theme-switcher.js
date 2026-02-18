// Theme Switcher System

// Available themes
const themes = {
    dark: {
        name: 'Oscuro Halloween',
        icon: '🎃',
        file: null // Default theme, no extra file needed
    },
    pastel: {
        name: 'Pastel Suave',
        icon: '🌸',
        file: '/static/themes/pastel-theme.css'
    },
    nature: {
        name: 'Naturaleza',
        icon: '🌿',
        file: '/static/themes/nature-theme.css'
    },
    space: {
        name: 'Espacio',
        icon: '🚀',
        file: '/static/themes/space-theme.css'
    },
    kawaii: {
        name: 'Kawaii',
        icon: '🎀',
        file: '/static/themes/kawaii-theme.css'
    }
};

// Initialize theme system
function initThemeSystem() {
    const savedTheme = localStorage.getItem('pomodoroTheme') || 'dark';
    applyTheme(savedTheme);
    createThemeSelector();
}

// Apply theme
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    // Remove all theme stylesheets
    document.querySelectorAll('link[data-theme-style]').forEach(link => link.remove());

    // Remove all theme data attributes
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');

    // Apply new theme
    if (theme.file) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = theme.file;
        link.setAttribute('data-theme-style', themeName);
        document.head.appendChild(link);

        document.documentElement.setAttribute('data-theme', themeName);
        document.body.setAttribute('data-theme', themeName);
    }

    // Save theme preference
    localStorage.setItem('pomodoroTheme', themeName);

    // Trigger theme-specific animations
    triggerThemeAnimations(themeName);

    // Update theme selector UI
    updateThemeSelectorUI(themeName);
}

// Create theme selector in navbar
function createThemeSelector() {
    const accordionMenu = document.getElementById('accordion-menu');
    if (!accordionMenu) return;

    // Create theme button
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-selector-btn';
    themeBtn.className = 'icon-btn';
    themeBtn.setAttribute('aria-label', 'Cambiar tema');
    themeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <span>Temas</span>
    `;

    // Insert before settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        accordionMenu.insertBefore(themeBtn, settingsBtn);
    } else {
        accordionMenu.appendChild(themeBtn);
    }

    // Create theme modal
    createThemeModal();

    // Add event listener
    themeBtn.addEventListener('click', () => {
        const modal = document.getElementById('theme-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    });
}

// Create theme selection modal
function createThemeModal() {
    const modal = document.createElement('div');
    modal.id = 'theme-modal';
    modal.className = 'modal-overlay hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'theme-modal-title');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="theme-modal-title">Selecciona un Tema</h2>
                <button id="close-theme-modal-btn" class="icon-btn" aria-label="Cerrar">&times;</button>
            </div>
            <div class="theme-grid">
                ${Object.entries(themes).map(([key, theme]) => `
                    <button class="theme-card" data-theme="${key}">
                        <span class="theme-icon">${theme.icon}</span>
                        <span class="theme-name">${theme.name}</span>
                        <span class="theme-check">✓</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('close-theme-modal-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Theme card click handlers
    modal.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const themeName = card.getAttribute('data-theme');
            applyTheme(themeName);
            modal.classList.add('hidden');
        });
    });
}

// Update theme selector UI
function updateThemeSelectorUI(currentTheme) {
    document.querySelectorAll('.theme-card').forEach(card => {
        const themeName = card.getAttribute('data-theme');
        if (themeName === currentTheme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// Trigger theme-specific animations
function triggerThemeAnimations(themeName) {
    // Clear existing animations
    document.querySelectorAll('.theme-animation').forEach(el => el.remove());

    switch (themeName) {
        case 'pastel':
            createFloatingHearts();
            break;
        case 'nature':
            createFallingLeaves();
            break;
        case 'space':
            createShootingStars();
            break;
        case 'kawaii':
            createConfetti();
            break;
    }
}

// Floating hearts for pastel theme
function createFloatingHearts() {
    setInterval(() => {
        const heart = document.createElement('div');
        heart.className = 'floating-hearts theme-animation';
        heart.textContent = '💖';
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(heart);

        setTimeout(() => heart.remove(), 8000);
    }, 3000);
}

// Falling leaves for nature theme
function createFallingLeaves() {
    const leaves = ['🍃', '🍂', '🌿'];
    setInterval(() => {
        const leaf = document.createElement('div');
        leaf.className = 'falling-leaf theme-animation';
        leaf.textContent = leaves[Math.floor(Math.random() * leaves.length)];
        leaf.style.left = Math.random() * 100 + '%';
        leaf.style.animationDuration = (Math.random() * 5 + 5) + 's';
        leaf.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(leaf);

        setTimeout(() => leaf.remove(), 12000);
    }, 2000);
}

// Shooting stars for space theme
function createShootingStars() {
    setInterval(() => {
        const star = document.createElement('div');
        star.className = 'shooting-star theme-animation';
        star.style.top = Math.random() * 50 + '%';
        star.style.left = Math.random() * 50 + '%';
        document.body.appendChild(star);

        setTimeout(() => star.remove(), 2000);
    }, 5000);
}

// Confetti for kawaii theme
function createConfetti() {
    const colors = ['pink', 'blue', 'yellow', 'purple'];
    setInterval(() => {
        for (let i = 0; i < 5; i++) {
            const confetti = document.createElement('div');
            confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]} theme-animation`;
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 1 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }
    }, 3000);
}

// Confetti burst on Pomodoro complete
function triggerConfettiBurst() {
    const currentTheme = localStorage.getItem('pomodoroTheme') || 'dark';

    if (currentTheme === 'kawaii' || currentTheme === 'pastel') {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti theme-animation';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '50%';
                confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
                document.body.appendChild(confetti);

                setTimeout(() => confetti.remove(), 3000);
            }, i * 20);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initThemeSystem();
});

// Export for use in main script
window.themeSystem = {
    applyTheme,
    triggerConfettiBurst
};
