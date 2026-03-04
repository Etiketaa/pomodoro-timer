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
        this.cryptoChat = window.CryptoChat ? new CryptoChat() : null;
        this.privateKey = null;
        this.senderPublicKey = null; // own public key for dual encryption
        this.recipientPublicKeys = {}; // cache: uid -> CryptoKey
        this._searchDebounceTimer = null;
        this._init();
    }

    _init() {
        this._createUI();
        this._bindEvents();
        // Load contacts when auth is ready
        if (auth.currentUser) {
            this._loadContacts();
            this._loadPrivateKey();
            this._loadSenderPublicKey();
        }
    }

    async _loadPrivateKey() {
        if (!this.cryptoChat || !this.uid) return;
        try {
            this.privateKey = await this.cryptoChat.loadPrivateKey(this.uid);
            if (this.privateKey) {
                console.log('🔐 Private key loaded for E2E decryption');
            }
        } catch (e) {
            console.warn('Could not load private key:', e);
        }
    }

    async _getRecipientPublicKey(contactUid) {
        if (this.recipientPublicKeys[contactUid]) {
            return this.recipientPublicKeys[contactUid];
        }
        if (!this.cryptoChat) return null;
        try {
            const userRef = doc(db, 'users', contactUid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().publicKey) {
                const key = await this.cryptoChat.importPublicKey(userSnap.data().publicKey);
                this.recipientPublicKeys[contactUid] = key;
                return key;
            }
        } catch (e) {
            console.warn('Could not load recipient public key:', e);
        }
        return null;
    }

    /**
     * Load own public key for dual encryption (sender readback)
     */
    async _loadSenderPublicKey() {
        if (!this.cryptoChat || !this.uid) return;
        try {
            const userRef = doc(db, 'users', this.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().publicKey) {
                this.senderPublicKey = await this.cryptoChat.importPublicKey(userSnap.data().publicKey);
                console.log('🔑 Sender public key loaded for dual encryption');
            }
        } catch (e) {
            console.warn('Could not load sender public key:', e);
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
            const cleanText = text.trim();
            let messageText = cleanText;
            let encrypted = false;

            // Try to encrypt the message with DUAL encryption (v2)
            if (this.cryptoChat && this.currentContactUid) {
                const recipientKey = await this._getRecipientPublicKey(this.currentContactUid);
                if (recipientKey && this.senderPublicKey) {
                    // Dual encryption: both sender and recipient can decrypt
                    messageText = await this.cryptoChat.encryptMessageDual(cleanText, recipientKey, this.senderPublicKey);
                    encrypted = true;
                } else if (recipientKey) {
                    // Fallback to v1 if sender public key not available
                    messageText = await this.cryptoChat.encryptMessage(cleanText, recipientKey);
                    encrypted = true;
                }
            }

            const messagesRef = collection(db, 'chats', this.currentChatId, 'messages');
            await addDoc(messagesRef, {
                text: messageText,
                senderId: this.uid,
                encrypted: encrypted,
                timestamp: serverTimestamp()
            });

            // Update last message (show preview only if not encrypted)
            const chatRef = doc(db, 'chats', this.currentChatId);
            await setDoc(chatRef, {
                lastMessage: encrypted ? '🔒 Mensaje encriptado' : cleanText.substring(0, 50),
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
                    <button id="chat-share-code-btn" class="chat-share-code-btn" title="Compartir tu código de amigo">📤</button>
                </div>
                <div id="chat-contacts-view" class="chat-body">
                    <div class="chat-add-contact">
                        <input type="text" id="chat-add-id" class="chat-add-input" 
                            placeholder="🔍 Nombre, email o código POMO-XXXX...">
                        <button id="chat-add-btn" class="chat-add-btn">Buscar</button>
                    </div>
                    <div id="chat-search-results" class="chat-search-results"></div>
                    <div id="chat-contact-list" class="chat-contact-list">
                        <p class="chat-empty">Buscá compañeros por nombre o código POMO para chatear</p>
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

        // Add contact / search button
        document.getElementById('chat-add-btn')?.addEventListener('click', () => this._handleAddContact());
        document.getElementById('chat-add-id')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._handleAddContact();
        });

        // Real-time search with debounce
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

        // Share friend code button
        document.getElementById('chat-share-code-btn')?.addEventListener('click', () => this._shareFriendCode());

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

        // If it looks like a friend code (POMO-XXXX), resolve it
        if (/^POMO-\d{4,5}$/i.test(searchTerm)) {
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '<p class="chat-searching">🔍 Buscando código...</p>';
            try {
                const codeRef = doc(db, 'friendCodes', searchTerm.toUpperCase());
                const codeSnap = await getDoc(codeRef);
                if (codeSnap.exists()) {
                    const success = await this.addContact(codeSnap.data().uid);
                    if (success) {
                        input.value = '';
                        resultsContainer.innerHTML = '';
                    }
                } else {
                    resultsContainer.innerHTML = '<p class="chat-no-results">No se encontró ese código de amigo.</p>';
                }
            } catch (e) {
                resultsContainer.innerHTML = '<p class="chat-no-results">Error al buscar código.</p>';
            }
            return;
        }

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
            const avatar = user.avatar || name[0]?.toUpperCase() || 'U';
            const friendCode = user.friendCode || '';
            const levelName = user.level ? `<span class="chat-search-level">${user.level}</span>` : '';
            return `
                <div class="chat-search-item">
                    <div class="chat-contact-avatar">${avatar}</div>
                    <div class="chat-contact-info">
                        <span class="chat-contact-name">${this._escapeHtml(name)} ${levelName}</span>
                        <span class="chat-contact-id">${friendCode ? `<span class="chat-friend-code-badge">${friendCode}</span>` : user.uid.slice(0, 8) + '...'}</span>
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

    /**
     * Share own friend code using Web Share API or clipboard fallback
     */
    async _shareFriendCode() {
        if (!this.uid) {
            Toast.show('Iniciá sesión primero', 'warning');
            return;
        }
        try {
            const userRef = doc(db, 'users', this.uid);
            const userSnap = await getDoc(userRef);
            const friendCode = userSnap.exists() ? userSnap.data().friendCode : null;

            if (!friendCode) {
                Toast.show('No se encontró tu código de amigo', 'error');
                return;
            }

            const shareText = `¡Agregame en Pomodoro Timer! Mi código de amigo es: ${friendCode}`;

            if (navigator.share) {
                await navigator.share({
                    title: 'Pomodoro Timer — Código de Amigo',
                    text: shareText
                });
            } else {
                await navigator.clipboard.writeText(friendCode);
                Toast.show(`📋 Código copiado: ${friendCode}`, 'success');
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('Share failed:', e);
                Toast.show('No se pudo compartir el código', 'error');
            }
        }
    }

    _renderContacts() {
        const list = document.getElementById('chat-contact-list');
        if (!list) return;

        if (this.contacts.length === 0) {
            list.innerHTML = '<p class="chat-empty">Buscá compañeros por nombre o código POMO para chatear</p>';
            return;
        }

        list.innerHTML = this.contacts.map(c => `
            <div class="chat-contact-item" data-chat-id="${c.chatId}" data-contact-name="${c.name}" data-contact-uid="${c.uid}">
                <div class="chat-contact-avatar">${(c.name || 'U')[0].toUpperCase()}</div>
                <div class="chat-contact-info">
                    <span class="chat-contact-name">${c.name}</span>
                    <span class="chat-contact-id">${c.friendCode || c.uid.substring(0, 8).toUpperCase()}</span>
                </div>
            </div>
        `).join('');

        // Bind contact click
        list.querySelectorAll('.chat-contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                const name = item.dataset.contactName;
                const uid = item.dataset.contactUid;
                this._openChat(chatId, name, uid);
            });
        });
    }

    _openChat(chatId, contactName, contactUid) {
        document.getElementById('chat-contacts-view')?.classList.add('hidden');
        document.getElementById('chat-messages-view')?.classList.remove('hidden');
        document.getElementById('chat-back-btn')?.classList.remove('hidden');
        document.getElementById('chat-header-title').textContent = contactName;

        this.currentContactUid = contactUid || null;
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

    async _renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p class="chat-empty">No hay mensajes aún. ¡Empezá la conversación!</p>';
            return;
        }

        // Decrypt messages — now supports sender readback with dual encryption (v2)
        const renderedMsgs = [];
        for (const msg of messages) {
            const isMine = msg.senderId === this.uid;
            let displayText = msg.text;

            if (msg.encrypted && this.privateKey && this.cryptoChat) {
                if (isMine) {
                    // Own message: try to decrypt using senderKey (v2) or show placeholder (v1)
                    displayText = await this.cryptoChat.decryptMessage(msg.text, this.privateKey, true);
                } else {
                    // Received message: decrypt using recipient key
                    displayText = await this.cryptoChat.decryptMessage(msg.text, this.privateKey, false);
                }
            } else if (msg.encrypted && isMine && !this.privateKey) {
                displayText = '🔒 Mensaje enviado (encriptado)';
            }

            const time = msg.timestamp?.toDate?.()
                ? msg.timestamp.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : '';

            const lockIcon = msg.encrypted ? '<span class="chat-lock-icon" title="Encriptado E2E">🔒</span>' : '';
            renderedMsgs.push(`
                <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
                    <div class="chat-msg-bubble">${this._escapeHtml(displayText)} ${lockIcon}</div>
                    <span class="chat-msg-time">${time}</span>
                </div>
            `);
        }

        container.innerHTML = renderedMsgs.join('');

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
