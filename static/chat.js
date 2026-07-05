/**
 * User Chat System for Pomodoro Timer v2
 * Uses REST API + Socket.IO for real-time messaging.
 * Server-side encryption (AES-256-GCM).
 */

import { apiClient } from './api-client.js';
import { socketClient } from './socket-client.js';

class UserChat {
    constructor() {
        this.currentChatId = null;
        this.contacts = [];
        this.isOpen = false;
        this._searchDebounceTimer = null;
        this._typingUsers = {};
        this._init();
    }

    _init() {
        this._createUI();
        this._bindEvents();
        this._bindSocketEvents();

        if (apiClient.isAuthenticated()) {
            this._loadContacts();
            this._connectSocket();
        }
    }

    get uid() {
        return window.PomodoroV2?.authManager?.getUserId() || null;
    }

    // --- Socket.IO ---

    _connectSocket() {
        const token = apiClient.token;
        if (!token) return;
        socketClient.connect(token);
    }

    _bindSocketEvents() {
        // New message received
        socketClient.on('new_message', (msg) => {
            if (msg.chatId === this.currentChatId) {
                this._appendMessage(msg);
            }
            this._updateContactLastMessage(msg);
        });

        // Typing indicators
        socketClient.on('user_typing', (data) => {
            if (data.chatId === this.currentChatId && data.userId !== this.uid) {
                this._showTypingIndicator(data.displayName);
            }
        });

        socketClient.on('user_stop_typing', (data) => {
            if (data.chatId === this.currentChatId) {
                this._hideTypingIndicator();
            }
        });

        // Presence
        socketClient.on('user_online', (data) => {
            this._updateContactPresence(data.userId, true);
        });

        socketClient.on('user_offline', (data) => {
            this._updateContactPresence(data.userId, false);
        });
    }

    // --- Contact Management ---

    async addContact(codeOrId) {
        if (!this.uid) {
            Toast.show('Necesitas iniciar sesion para chatear', 'warning');
            return false;
        }

        try {
            const { contact } = await apiClient.request('POST', '/chat/contacts', { code: codeOrId });

            const contacts = this._getLocalContacts();
            if (!contacts.find(c => c.id === contact.id)) {
                contacts.push({
                    id: contact.id,
                    name: contact.displayName,
                    friendCode: contact.friendCode,
                    chatId: contact.chatId,
                });
                this._saveLocalContacts(contacts);
            }

            Toast.show(`${contact.displayName} agregado`, 'success');
            this._loadContacts();
            const searchResults = document.getElementById('chat-search-results');
            if (searchResults) searchResults.innerHTML = '';
            return true;
        } catch (error) {
            Toast.show(error.message || 'Error al agregar contacto', 'error');
            return false;
        }
    }

    async searchUsers(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) return [];
        if (!this.uid) return [];

        try {
            const { users } = await apiClient.searchUsers(searchTerm);
            return users;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    _getLocalContacts() {
        try {
            return JSON.parse(localStorage.getItem('pomodoroContacts')) || [];
        } catch { return []; }
    }

    _saveLocalContacts(contacts) {
        localStorage.setItem('pomodoroContacts', JSON.stringify(contacts));
    }

    async _loadContacts() {
        try {
            const { chats } = await apiClient.getChats();
            const local = this._getLocalContacts();
            const apiContacts = chats.map(c => ({
                id: c.otherUser?.id,
                name: c.otherUser?.displayName || 'Usuario',
                friendCode: c.otherUser?.friendCode,
                chatId: c.id,
                lastMessage: c.lastMessage,
                lastMessageTime: c.lastMessageTime,
            })).filter(c => c.id);

            const merged = new Map();
            for (const c of apiContacts) merged.set(c.id, c);
            for (const c of local) {
                if (!merged.has(c.id)) merged.set(c.id, c);
            }

            this.contacts = Array.from(merged.values());
            this._saveLocalContacts(this.contacts);
            this._renderContacts();
        } catch (error) {
            console.warn('Could not load chats from API:', error);
            this.contacts = this._getLocalContacts();
            this._renderContacts();
        }
    }

    // --- Messaging ---

    async sendMessage(text) {
        if (!this.uid || !this.currentChatId || !text.trim()) return;

        // Send via Socket.IO for real-time
        socketClient.sendMessage(this.currentChatId, text);
    }

    async _loadMessages(chatId) {
        try {
            const { messages } = await apiClient.getMessages(chatId);
            this._renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    // --- UI ---

    _createUI() {
        const overlay = document.createElement('div');
        overlay.id = 'chat-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="overlay-content chat-modal-content">
                <button id="chat-close-btn" class="close-btn" aria-label="Cerrar">&times;</button>
                <div class="chat-header">
                    <button id="chat-back-btn" class="chat-back-btn hidden">&larr;</button>
                    <span id="chat-header-title">Chat</span>
                    <span id="chat-typing-indicator" class="chat-typing hidden"></span>
                </div>
                <div id="chat-contacts-view" class="chat-body">
                    <div class="chat-add-contact">
                        <input type="text" id="chat-add-id" class="chat-add-input"
                            placeholder="Nombre, email o codigo POMO-XXXX...">
                        <button id="chat-add-btn" class="chat-add-btn">Buscar</button>
                    </div>
                    <div id="chat-search-results" class="chat-search-results"></div>
                    <div id="chat-contact-list" class="chat-contact-list">
                        <p class="chat-empty">Busca companeros por nombre o codigo POMO para chatear</p>
                    </div>
                </div>
                <div id="chat-messages-view" class="chat-body hidden">
                    <div id="chat-messages" class="chat-messages"></div>
                    <div class="chat-input-row">
                        <input type="text" id="chat-msg-input" class="chat-msg-input"
                            placeholder="Escribi un mensaje..." maxlength="500">
                        <button id="chat-send-btn" class="chat-send-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const accordionMenu = document.getElementById('accordion-menu');
        if (accordionMenu) {
            const chatTabBtn = document.createElement('button');
            chatTabBtn.id = 'chat-toggle-btn';
            chatTabBtn.className = 'icon-btn chat-tab-btn';
            chatTabBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Chat</span>
            `;
            const customizeBtn = document.getElementById('customize-btn');
            if (customizeBtn) {
                accordionMenu.insertBefore(chatTabBtn, customizeBtn);
            } else {
                accordionMenu.appendChild(chatTabBtn);
            }
            this.toggleBtn = chatTabBtn;
        }

        this.panel = overlay;
    }

    _bindEvents() {
        this.toggleBtn?.addEventListener('click', () => {
            this._toggleChat();
            document.getElementById('accordion-menu')?.classList.add('hidden');
        });
        document.getElementById('chat-close-btn')?.addEventListener('click', () => this._toggleChat(false));
        this.panel?.addEventListener('click', (e) => {
            if (e.target === this.panel) this._toggleChat(false);
        });

        document.getElementById('chat-add-btn')?.addEventListener('click', () => this._handleAddContact());
        document.getElementById('chat-add-id')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleAddContact();
        });

        document.getElementById('chat-add-id')?.addEventListener('input', (e) => {
            clearTimeout(this._searchDebounceTimer);
            const value = e.target.value.trim();
            if (value.length < 2) {
                const resultsContainer = document.getElementById('chat-search-results');
                if (resultsContainer) resultsContainer.innerHTML = '';
                return;
            }
            this._searchDebounceTimer = setTimeout(() => this._handleAddContact(), 300);
        });

        document.getElementById('chat-send-btn')?.addEventListener('click', () => this._handleSendMessage());
        document.getElementById('chat-msg-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleSendMessage();
        });

        // Typing indicator on input
        document.getElementById('chat-msg-input')?.addEventListener('input', () => {
            if (this.currentChatId) {
                socketClient.startTyping(this.currentChatId);
            }
        });

        document.getElementById('chat-back-btn')?.addEventListener('click', () => this._showContactsView());
    }

    _toggleChat(forceState) {
        if (!apiClient.isAuthenticated()) {
            Toast.show('Inicia sesion para usar el chat', 'warning');
            return;
        }
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.panel.classList.toggle('hidden', !this.isOpen);
        this.toggleBtn.classList.toggle('active', this.isOpen);
        if (this.isOpen) {
            this._loadContacts();
            if (!socketClient.connected) this._connectSocket();
        }
    }

    async _handleAddContact() {
        const input = document.getElementById('chat-add-id');
        const searchTerm = input?.value.trim();
        if (!searchTerm) return;

        const resultsContainer = document.getElementById('chat-search-results');

        if (/^POMO-\d{4,5}$/i.test(searchTerm) || (searchTerm.length > 15 && !searchTerm.includes(' '))) {
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '<p class="chat-searching">Buscando...</p>';
            const success = await this.addContact(searchTerm);
            if (success) {
                input.value = '';
                resultsContainer.innerHTML = '';
            } else {
                resultsContainer.innerHTML = '<p class="chat-no-results">No se encontro ese usuario.</p>';
            }
            return;
        }

        const results = await this.searchUsers(searchTerm);
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="chat-no-results">No se encontraron usuarios.</p>';
            return;
        }

        const existingContacts = this._getLocalContacts();
        const existingIds = new Set(existingContacts.map(c => c.id));

        resultsContainer.innerHTML = results.map(user => {
            const isAlready = existingIds.has(user.id);
            const name = user.display_name || 'Usuario';
            return `
                <div class="chat-search-item">
                    <div class="chat-contact-avatar">${name[0]?.toUpperCase()}</div>
                    <div class="chat-contact-info">
                        <span class="chat-contact-name">${name}</span>
                        <span class="chat-contact-id">${user.friend_code || user.id?.substring(0, 8)}</span>
                    </div>
                    ${isAlready
                        ? '<span class="chat-already-added">Agregado</span>'
                        : `<button class="chat-search-add-btn" data-id="${user.id}">+ Agregar</button>`
                    }
                </div>
            `;
        }).join('');

        resultsContainer.querySelectorAll('.chat-search-add-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = '...';
                const success = await this.addContact(btn.dataset.id);
                if (success) {
                    btn.textContent = 'Agregado';
                    btn.classList.add('added');
                } else {
                    btn.disabled = false;
                    btn.textContent = '+ Agregar';
                }
            });
        });
    }

    _handleSendMessage() {
        const input = document.getElementById('chat-msg-input');
        const text = input?.value.trim();
        if (!text) return;
        this.sendMessage(text);
        input.value = '';
    }

    _renderContacts() {
        const list = document.getElementById('chat-contact-list');
        if (!list) return;

        if (this.contacts.length === 0) {
            list.innerHTML = '<p class="chat-empty">Busca companeros por nombre o codigo POMO para chatear</p>';
            return;
        }

        list.innerHTML = this.contacts.map(c => `
            <div class="chat-contact-item" data-chat-id="${c.chatId}" data-contact-name="${c.name}" data-contact-id="${c.id}">
                <div class="chat-contact-avatar">${(c.name || 'U')[0].toUpperCase()}</div>
                <div class="chat-contact-info">
                    <span class="chat-contact-name">${c.name}</span>
                    <span class="chat-contact-id">${c.friendCode || c.id?.substring(0, 8)}</span>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.chat-contact-item').forEach(item => {
            item.addEventListener('click', () => {
                this._openChat(item.dataset.chatId, item.dataset.contactName, item.dataset.contactId);
            });
        });
    }

    _openChat(chatId, contactName, contactUid) {
        // Leave previous chat room
        if (this.currentChatId) {
            socketClient.leaveChat(this.currentChatId);
        }

        document.getElementById('chat-contacts-view')?.classList.add('hidden');
        document.getElementById('chat-messages-view')?.classList.remove('hidden');
        document.getElementById('chat-back-btn')?.classList.remove('hidden');
        document.getElementById('chat-header-title').textContent = contactName;

        this.currentChatId = chatId;
        this.currentContactUid = contactUid;

        // Join chat room for real-time messages
        socketClient.joinChat(chatId);

        // Load history
        this._loadMessages(chatId);
        this._hideTypingIndicator();

        setTimeout(() => document.getElementById('chat-msg-input')?.focus(), 100);
    }

    _showContactsView() {
        if (this.currentChatId) {
            socketClient.leaveChat(this.currentChatId);
        }

        document.getElementById('chat-contacts-view')?.classList.remove('hidden');
        document.getElementById('chat-messages-view')?.classList.add('hidden');
        document.getElementById('chat-back-btn')?.classList.add('hidden');
        document.getElementById('chat-header-title').textContent = 'Chat';
        this._hideTypingIndicator();

        this.currentChatId = null;
    }

    _appendMessage(msg) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        // Remove empty state
        const empty = container.querySelector('.chat-empty');
        if (empty) empty.remove();

        const isMine = msg.senderId === this.uid;
        const time = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const lockIcon = msg.encrypted ? '<span class="chat-lock-icon" title="Encriptado">🔒</span>' : '';

        const div = document.createElement('div');
        div.className = `chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}`;
        div.innerHTML = `
            <div class="chat-msg-bubble">${this._escapeHtml(msg.text)} ${lockIcon}</div>
            <span class="chat-msg-time">${time}</span>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    _renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p class="chat-empty">No hay mensajes aun. Empeza la conversacion!</p>';
            return;
        }

        const myId = this.uid;
        container.innerHTML = messages.map(msg => {
            const isMine = msg.senderId === myId;
            const time = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : '';
            const lockIcon = msg.encrypted ? '<span class="chat-lock-icon" title="Encriptado">🔒</span>' : '';
            return `
                <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                    <div class="chat-msg-bubble">${this._escapeHtml(msg.text)} ${lockIcon}</div>
                    <span class="chat-msg-time">${time}</span>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    _showTypingIndicator(name) {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) {
            indicator.textContent = `${name} esta escribiendo...`;
            indicator.classList.remove('hidden');
        }
    }

    _hideTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    _updateContactLastMessage(msg) {
        const contact = this.contacts.find(c => c.chatId === msg.chatId);
        if (contact) {
            contact.lastMessage = msg.text;
            contact.lastMessageTime = msg.timestamp;
            this._saveLocalContacts(this.contacts);
            this._renderContacts();
        }
    }

    _updateContactPresence(userId, online) {
        const items = document.querySelectorAll(`.chat-contact-item[data-contact-id="${userId}"]`);
        items.forEach(item => {
            item.classList.toggle('online', online);
        });
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        socketClient.disconnect();
    }
}

export { UserChat };
