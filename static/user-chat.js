/**
 * User Chat System for Pomodoro Timer v2
 * Real-time messaging between users using Firestore
 * Uses ES module imports from firebase-config.js
 */

import {
    db, auth, doc, setDoc, getDoc, collection, query, where, getDocs,
    onSnapshot, addDoc, orderBy, limit, serverTimestamp
} from './firebase-config.js';

class UserChat {
    constructor() {
        this.currentChatId = null;
        this.contacts = [];
        this.unsubscribe = null;
        this.isOpen = false;
        this.unreadCounts = {};
        this._init();
    }

    _init() {
        this._createUI();
        this._bindEvents();
        // Load contacts when auth is ready
        if (auth.currentUser) {
            this._loadContacts();
        }
    }

    get uid() {
        return auth.currentUser?.uid;
    }

    // --- Contact Management ---

    async addContact(contactUid) {
        if (!this.uid) {
            Toast.show('Necesitás iniciar sesión para chatear', 'warning');
            return false;
        }
        if (contactUid === this.uid) {
            Toast.show('No podés agregarte a vos mismo', 'warning');
            return false;
        }

        try {
            // Check if user exists
            const userRef = doc(db, 'users', contactUid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                Toast.show('No se encontró un usuario con ese ID', 'error');
                return false;
            }

            const contactData = userSnap.data();

            // Create/get chat
            const chatId = this._getChatId(this.uid, contactUid);
            const chatRef = doc(db, 'chats', chatId);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    participants: [this.uid, contactUid],
                    createdAt: serverTimestamp(),
                    lastMessage: '',
                    lastMessageTime: serverTimestamp()
                });
            }

            // Save contact locally
            const contacts = this._getLocalContacts();
            if (!contacts.find(c => c.uid === contactUid)) {
                contacts.push({
                    uid: contactUid,
                    name: contactData.displayName || contactData.email?.split('@')[0] || 'Usuario',
                    chatId: chatId
                });
                this._saveLocalContacts(contacts);
            }

            Toast.show(`✅ ${contactData.displayName || 'Usuario'} agregado`, 'success');
            this._loadContacts();
            // Clear search results
            const searchResults = document.getElementById('chat-search-results');
            if (searchResults) searchResults.innerHTML = '';
            return true;
        } catch (error) {
            console.error('Error adding contact:', error);
            Toast.show('Error al agregar contacto', 'error');
            return false;
        }
    }

    async searchUsers(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) return [];
        if (!this.uid) return [];

        try {
            // First try exact ID match
            const directRef = doc(db, 'users', searchTerm);
            const directSnap = await getDoc(directRef);
            if (directSnap.exists() && directSnap.id !== this.uid) {
                return [{ uid: directSnap.id, ...directSnap.data() }];
            }

            // Search by displayName using range query (starts with)
            const searchLower = searchTerm.toLowerCase();
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('displayNameLower', '>=', searchLower),
                where('displayNameLower', '<=', searchLower + '\uf8ff'),
                limit(10)
            );

            const snap = await getDocs(q);
            const results = [];
            snap.forEach(docSnap => {
                if (docSnap.id !== this.uid) {
                    results.push({ uid: docSnap.id, ...docSnap.data() });
                }
            });

            // If no results with displayNameLower, try email prefix
            if (results.length === 0) {
                const emailQ = query(
                    usersRef,
                    where('email', '>=', searchLower),
                    where('email', '<=', searchLower + '\uf8ff'),
                    limit(10)
                );
                const emailSnap = await getDocs(emailQ);
                emailSnap.forEach(docSnap => {
                    if (docSnap.id !== this.uid) {
                        results.push({ uid: docSnap.id, ...docSnap.data() });
                    }
                });
            }

            return results;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    _getChatId(uid1, uid2) {
        return [uid1, uid2].sort().join('_');
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
        this.contacts = this._getLocalContacts();
        this._renderContacts();
    }

    // --- Messaging ---

    async sendMessage(text) {
        if (!this.uid || !this.currentChatId || !text.trim()) return;

        try {
            const messagesRef = collection(db, 'chats', this.currentChatId, 'messages');
            await addDoc(messagesRef, {
                text: text.trim(),
                senderId: this.uid,
                timestamp: serverTimestamp()
            });

            // Update last message in chat doc
            const chatRef = doc(db, 'chats', this.currentChatId);
            await setDoc(chatRef, {
                lastMessage: text.trim().substring(0, 50),
                lastMessageTime: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error('Error sending message:', error);
            Toast.show('Error al enviar mensaje', 'error');
        }
    }

    _listenToMessages(chatId) {
        // Unsubscribe from previous chat
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        this.currentChatId = chatId;
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            this._renderMessages(messages);
        });
    }

    // --- UI ---

    _createUI() {
        // Create overlay modal for chat
        const overlay = document.createElement('div');
        overlay.id = 'chat-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="overlay-content chat-modal-content">
                <button id="chat-close-btn" class="close-btn" aria-label="Cerrar">&times;</button>
                <div class="chat-header">
                    <button id="chat-back-btn" class="chat-back-btn hidden">←</button>
                    <span id="chat-header-title">💬 Chat</span>
                </div>
                <div id="chat-contacts-view" class="chat-body">
                    <div class="chat-add-contact">
                        <input type="text" id="chat-add-id" class="chat-add-input" 
                            placeholder="🔍 Buscar por nombre o pegar ID...">
                        <button id="chat-add-btn" class="chat-add-btn">Buscar</button>
                    </div>
                    <div id="chat-search-results" class="chat-search-results"></div>
                    <div id="chat-contact-list" class="chat-contact-list">
                        <p class="chat-empty">Buscá compañeros por nombre o ID para empezar a chatear</p>
                    </div>
                </div>
                <div id="chat-messages-view" class="chat-body hidden">
                    <div id="chat-messages" class="chat-messages"></div>
                    <div class="chat-input-row">
                        <input type="text" id="chat-msg-input" class="chat-msg-input" 
                            placeholder="Escribí un mensaje..." maxlength="500">
                        <button id="chat-send-btn" class="chat-send-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
                                fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Create visible tab button in accordion menu
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
            // Insert before gallery/customize if present, otherwise append
            const customizeBtn = document.getElementById('customize-btn');
            if (customizeBtn) {
                accordionMenu.insertBefore(chatTabBtn, customizeBtn);
            } else {
                const firstLink = accordionMenu.querySelector('a');
                if (firstLink) accordionMenu.insertBefore(chatTabBtn, firstLink);
                else accordionMenu.appendChild(chatTabBtn);
            }
            this.toggleBtn = chatTabBtn;
        } else {
            // Fallback: create a standalone visible button
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'chat-toggle-btn';
            toggleBtn.className = 'chat-toggle-btn';
            toggleBtn.innerHTML = '💬';
            toggleBtn.title = 'Chat';
            document.body.appendChild(toggleBtn);
            this.toggleBtn = toggleBtn;
        }

        this.panel = overlay;
    }

    _bindEvents() {
        // Toggle chat
        this.toggleBtn?.addEventListener('click', () => {
            this._toggleChat();
            document.getElementById('accordion-menu')?.classList.add('hidden');
        });
        document.getElementById('chat-close-btn')?.addEventListener('click', () => this._toggleChat(false));
        // Close on overlay click
        this.panel?.addEventListener('click', (e) => {
            if (e.target === this.panel) this._toggleChat(false);
        });

        // Add contact / search
        document.getElementById('chat-add-btn')?.addEventListener('click', () => this._handleAddContact());
        document.getElementById('chat-add-id')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleAddContact();
        });

        // Send message
        document.getElementById('chat-send-btn')?.addEventListener('click', () => this._handleSendMessage());
        document.getElementById('chat-msg-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleSendMessage();
        });

        // Back button
        document.getElementById('chat-back-btn')?.addEventListener('click', () => this._showContactsView());
    }

    _toggleChat(forceState) {
        if (!this.uid) {
            Toast.show('Iniciá sesión para usar el chat', 'warning');
            return;
        }
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.panel.classList.toggle('hidden', !this.isOpen);
        this.toggleBtn.classList.toggle('active', this.isOpen);
        if (this.isOpen) this._loadContacts();
    }

    async _handleAddContact() {
        const input = document.getElementById('chat-add-id');
        const searchTerm = input?.value.trim();
        if (!searchTerm) return;

        const resultsContainer = document.getElementById('chat-search-results');

        // If it looks like a UID (long alphanumeric), try direct add
        if (searchTerm.length > 15 && !searchTerm.includes(' ')) {
            const success = await this.addContact(searchTerm);
            if (success) input.value = '';
            return;
        }

        // Otherwise, search
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '<p class="chat-searching">🔍 Buscando...</p>';

        const results = await this.searchUsers(searchTerm);

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="chat-no-results">No se encontraron usuarios. Probá con otro nombre o pegá el ID directamente.</p>';
            return;
        }

        // Check which ones are already contacts
        const existingContacts = this._getLocalContacts();
        const existingUids = new Set(existingContacts.map(c => c.uid));

        resultsContainer.innerHTML = results.map(user => {
            const isAlready = existingUids.has(user.uid);
            const name = user.displayName || user.email?.split('@')[0] || 'Usuario';
            const initial = name[0]?.toUpperCase() || 'U';
            return `
                <div class="chat-search-item">
                    <div class="chat-contact-avatar">${initial}</div>
                    <div class="chat-contact-info">
                        <span class="chat-contact-name">${this._escapeHtml(name)}</span>
                        <span class="chat-contact-id">${user.uid.slice(0, 8)}...</span>
                    </div>
                    ${isAlready
                    ? '<span class="chat-already-added">✓ Agregado</span>'
                    : `<button class="chat-search-add-btn" data-uid="${user.uid}">+ Agregar</button>`
                }
                </div>
            `;
        }).join('');

        // Bind add buttons
        resultsContainer.querySelectorAll('.chat-search-add-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = '...';
                const success = await this.addContact(btn.dataset.uid);
                if (success) {
                    btn.textContent = '✓';
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
            list.innerHTML = '<p class="chat-empty">Agregá un contacto con su User ID para empezar a chatear</p>';
            return;
        }

        list.innerHTML = this.contacts.map(c => `
            <div class="chat-contact-item" data-chat-id="${c.chatId}" data-contact-name="${c.name}">
                <div class="chat-contact-avatar">${(c.name || 'U')[0].toUpperCase()}</div>
                <div class="chat-contact-info">
                    <span class="chat-contact-name">${c.name}</span>
                    <span class="chat-contact-id">${c.uid.substring(0, 8).toUpperCase()}</span>
                </div>
            </div>
        `).join('');

        // Bind contact click
        list.querySelectorAll('.chat-contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                const name = item.dataset.contactName;
                this._openChat(chatId, name);
            });
        });
    }

    _openChat(chatId, contactName) {
        document.getElementById('chat-contacts-view')?.classList.add('hidden');
        document.getElementById('chat-messages-view')?.classList.remove('hidden');
        document.getElementById('chat-back-btn')?.classList.remove('hidden');
        document.getElementById('chat-header-title').textContent = contactName;

        this._listenToMessages(chatId);
        setTimeout(() => document.getElementById('chat-msg-input')?.focus(), 100);
    }

    _showContactsView() {
        document.getElementById('chat-contacts-view')?.classList.remove('hidden');
        document.getElementById('chat-messages-view')?.classList.add('hidden');
        document.getElementById('chat-back-btn')?.classList.add('hidden');
        document.getElementById('chat-header-title').textContent = '💬 Chat';

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.currentChatId = null;
    }

    _renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p class="chat-empty">No hay mensajes aún. ¡Empezá la conversación!</p>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isMine = msg.senderId === this.uid;
            const time = msg.timestamp?.toDate?.()
                ? msg.timestamp.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : '';
            return `
                <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                    <div class="chat-msg-bubble">${this._escapeHtml(msg.text)}</div>
                    <span class="chat-msg-time">${time}</span>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
    }
}

// Export for module usage
export { UserChat };
