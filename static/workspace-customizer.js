/**
 * Workspace Customizer for Pomodoro Timer MVP
 * Drag-and-drop layout reordering + background selector
 */

class WorkspaceCustomizer {
    constructor() {
        this.isEditMode = false;
        this.sortableInstances = [];
        this.BACKGROUNDS = [
            { id: 'default', name: 'Oscuro', value: 'none', preview: '#0f0f0f' },
            { id: 'gradient-warm', name: 'Cálido', value: 'linear-gradient(135deg, #1a0a00 0%, #0f0f0f 50%, #0a0a14 100%)', preview: 'linear-gradient(135deg, #1a0a00, #0a0a14)' },
            { id: 'gradient-ocean', name: 'Océano', value: 'linear-gradient(135deg, #000a14 0%, #0f0f0f 50%, #0a1410 100%)', preview: 'linear-gradient(135deg, #000a14, #0a1410)' },
            { id: 'gradient-purple', name: 'Noche', value: 'linear-gradient(135deg, #0a0014 0%, #0f0f0f 50%, #140a10 100%)', preview: 'linear-gradient(135deg, #0a0014, #140a10)' },
            { id: 'gradient-forest', name: 'Bosque', value: 'linear-gradient(135deg, #050f05 0%, #0f0f0f 50%, #0a0f05 100%)', preview: 'linear-gradient(135deg, #050f05, #0a0f05)' },
            { id: 'gradient-sunset', name: 'Sunset', value: 'linear-gradient(135deg, #140a00 0%, #0f0505 50%, #0f0a14 100%)', preview: 'linear-gradient(135deg, #140a00, #0f0a14)' },
        ];
        this._loadPreferences();
        this._createUI();
        this._applyBackground();
        this._applyLayout();
    }

    _loadPreferences() {
        try {
            const saved = JSON.parse(localStorage.getItem('workspacePrefs'));
            this.prefs = saved || { background: 'default', layoutOrder: [] };
        } catch {
            this.prefs = { background: 'default', layoutOrder: [] };
        }
    }

    _savePreferences() {
        localStorage.setItem('workspacePrefs', JSON.stringify(this.prefs));
    }

    _createUI() {
        // Create customize button in navbar accordion menu
        const accordionMenu = document.getElementById('accordion-menu');
        if (accordionMenu) {
            const customizeBtn = document.createElement('button');
            customizeBtn.id = 'customize-btn';
            customizeBtn.className = 'icon-btn';
            customizeBtn.setAttribute('aria-label', 'Personalizar');
            customizeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Personalizar</span>
            `;
            // Insert before the gallery link
            const galleryLink = accordionMenu.querySelector('a[href="/gallery"]');
            if (galleryLink) {
                accordionMenu.insertBefore(customizeBtn, galleryLink);
            } else {
                accordionMenu.appendChild(customizeBtn);
            }
            customizeBtn.addEventListener('click', () => this._openPanel());
        }

        // Create the customization panel
        this.panel = document.createElement('div');
        this.panel.id = 'customize-panel';
        this.panel.className = 'overlay hidden';
        this.panel.innerHTML = `
            <div class="overlay-content customize-panel-content">
                <button id="close-customize-panel" class="close-btn" aria-label="Cerrar">&times;</button>
                <h2 class="overlay-title">🎨 Personalizar Espacio</h2>

                <div class="customize-section">
                    <h3 class="customize-section-title">Fondo</h3>
                    <div class="bg-selector" id="bg-selector"></div>
                </div>

                <div class="customize-section">
                    <h3 class="customize-section-title">Layout</h3>
                    <p class="customize-hint">Arrastrá los widgets para reordenar tu espacio de trabajo.</p>
                    <button id="toggle-edit-mode" class="customize-edit-btn">
                        <span class="edit-icon">✏️</span> Modo Edición
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Render background selector
        this._renderBackgrounds();

        // Bind events
        document.getElementById('close-customize-panel')?.addEventListener('click', () => this._closePanel());
        this.panel.addEventListener('click', (e) => { if (e.target === this.panel) this._closePanel(); });
        document.getElementById('toggle-edit-mode')?.addEventListener('click', () => this._toggleEditMode());
    }

    _renderBackgrounds() {
        const container = document.getElementById('bg-selector');
        if (!container) return;

        container.innerHTML = '';
        this.BACKGROUNDS.forEach(bg => {
            const el = document.createElement('button');
            el.className = `bg-option ${this.prefs.background === bg.id ? 'selected' : ''}`;
            el.style.background = bg.preview;
            el.title = bg.name;
            el.innerHTML = `<span class="bg-option-label">${bg.name}</span>`;
            el.addEventListener('click', () => {
                this.prefs.background = bg.id;
                this._savePreferences();
                this._applyBackground();
                // Update selection UI
                container.querySelectorAll('.bg-option').forEach(o => o.classList.remove('selected'));
                el.classList.add('selected');
                if (window.Toast) Toast.show(`Fondo: ${bg.name} 🎨`, 'success', 2000);
            });
            container.appendChild(el);
        });
    }

    _applyBackground() {
        const bg = this.BACKGROUNDS.find(b => b.id === this.prefs.background);
        if (bg) {
            document.body.style.background = bg.value === 'none' ? '' : bg.value;
        }
    }

    _applyLayout() {
        if (!this.prefs.layoutOrder || this.prefs.layoutOrder.length === 0) return;

        const container = document.querySelector('.app-container');
        if (!container) return;

        // Get all draggable grid areas
        const gridAreas = container.querySelectorAll('[data-widget-id]');
        if (gridAreas.length === 0) return;

        // Reorder based on saved layout
        this.prefs.layoutOrder.forEach(widgetId => {
            const widget = container.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widget) {
                container.appendChild(widget);
            }
        });
    }

    _openPanel() {
        this.panel.classList.remove('hidden');
        document.getElementById('accordion-menu')?.classList.add('hidden');
    }

    _closePanel() {
        this.panel.classList.add('hidden');
        if (this.isEditMode) this._toggleEditMode();
    }

    _toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const btn = document.getElementById('toggle-edit-mode');
        const appContainer = document.querySelector('.app-container');

        if (this.isEditMode) {
            btn.classList.add('active');
            btn.innerHTML = '<span class="edit-icon">✅</span> Guardar Layout';
            appContainer?.classList.add('edit-mode');

            // Add data-widget-id to grid areas if not set
            const widgetElements = appContainer?.querySelectorAll('.grid-area, .task-columns-tablet-group, .misc-widgets-tablet-group');
            widgetElements?.forEach((el, i) => {
                if (!el.getAttribute('data-widget-id')) {
                    el.setAttribute('data-widget-id', el.id || `widget-${i}`);
                }
            });

            // Enable sortable on the app container
            if (appContainer && typeof Sortable !== 'undefined') {
                this.sortableInstance = new Sortable(appContainer, {
                    animation: 250,
                    ghostClass: 'widget-ghost',
                    dragClass: 'widget-dragging',
                    handle: '.widget-drag-handle',
                    filter: '.task-card, input, button, select, textarea',
                    preventOnFilter: false,
                    onEnd: () => {
                        this._saveLayoutOrder();
                    }
                });

                // Add drag handles
                widgetElements?.forEach(el => {
                    if (!el.querySelector('.widget-drag-handle')) {
                        const handle = document.createElement('div');
                        handle.className = 'widget-drag-handle';
                        handle.innerHTML = '⠿';
                        el.insertBefore(handle, el.firstChild);
                    }
                });
            }
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<span class="edit-icon">✏️</span> Modo Edición';
            appContainer?.classList.remove('edit-mode');

            // Destroy sortable
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
                this.sortableInstance = null;
            }

            // Remove drag handles
            appContainer?.querySelectorAll('.widget-drag-handle').forEach(h => h.remove());

            if (window.Toast) Toast.show('Layout guardado ✅', 'success', 2000);
        }
    }

    _saveLayoutOrder() {
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        const order = [];
        appContainer.querySelectorAll('[data-widget-id]').forEach(el => {
            order.push(el.getAttribute('data-widget-id'));
        });

        this.prefs.layoutOrder = order;
        this._savePreferences();
    }
}

window.WorkspaceCustomizer = WorkspaceCustomizer;
