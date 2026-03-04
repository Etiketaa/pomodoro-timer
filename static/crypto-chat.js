/**
 * CryptoChat — End-to-End Encryption for Pomodoro Chat
 * Uses Web Crypto API (native browser, no external libraries)
 * 
 * Flow:
 * 1. User registers → generateKeyPair() → public key saved to Firestore, private key to IndexedDB
 * 2. User sends message → encrypt(text, recipientPublicKey) → encrypted text saved to Firestore
 * 3. User receives message → decrypt(encryptedText, ownPrivateKey) → readable text
 */

class CryptoChat {
    constructor() {
        this.DB_NAME = 'pomodoroCryptoKeys';
        this.DB_STORE = 'keys';
        this.DB_VERSION = 1;
        this._db = null;
    }

    // --- KEY GENERATION ---

    /**
     * Generate an RSA-OAEP key pair for encryption/decryption
     * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
     */
    async generateKeyPair() {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true, // extractable
            ['encrypt', 'decrypt']
        );
        return keyPair;
    }

    // --- KEY EXPORT/IMPORT ---

    /**
     * Export public key as JWK (to store in Firestore)
     */
    async exportPublicKey(publicKey) {
        return await crypto.subtle.exportKey('jwk', publicKey);
    }

    /**
     * Import a public key from JWK format (from Firestore)
     */
    async importPublicKey(jwk) {
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );
    }

    /**
     * Export private key as JWK (for backup)
     */
    async exportPrivateKey(privateKey) {
        return await crypto.subtle.exportKey('jwk', privateKey);
    }

    /**
     * Import a private key from JWK format (from backup)
     */
    async importPrivateKey(jwk) {
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
        );
    }

    // --- ENCRYPTION / DECRYPTION ---

    /**
     * Encrypt a message using the recipient's public key (v1 - legacy)
     * Uses hybrid encryption: AES-GCM for the message, RSA-OAEP for the AES key
     */
    async encryptMessage(text, recipientPublicKey) {
        const aesKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt']
        );

        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedContent = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            encoder.encode(text)
        );

        const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
        const encryptedAesKey = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            recipientPublicKey,
            rawAesKey
        );

        return JSON.stringify({
            v: 1,
            key: this._arrayBufferToBase64(encryptedAesKey),
            iv: this._arrayBufferToBase64(iv),
            data: this._arrayBufferToBase64(encryptedContent)
        });
    }

    /**
     * Encrypt a message with DUAL keys — both sender and recipient can decrypt.
     * v2 format: includes senderKey (AES key encrypted with sender's own public key)
     * @param {string} text - plain text message
     * @param {CryptoKey} recipientPublicKey - recipient's RSA public key
     * @param {CryptoKey} senderPublicKey - sender's own RSA public key
     * @returns {Promise<string>} JSON encrypted payload
     */
    async encryptMessageDual(text, recipientPublicKey, senderPublicKey) {
        // 1. Generate a random AES key for this message
        const aesKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt']
        );

        // 2. Encrypt the message with AES-GCM
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedContent = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            encoder.encode(text)
        );

        // 3. Export the AES key raw
        const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

        // 4. Encrypt AES key with RECIPIENT's public key
        const encryptedAesKeyRecipient = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            recipientPublicKey,
            rawAesKey
        );

        // 5. Encrypt AES key with SENDER's own public key
        const encryptedAesKeySender = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            senderPublicKey,
            rawAesKey
        );

        // 6. Package everything — v2 includes senderKey
        return JSON.stringify({
            v: 2,
            key: this._arrayBufferToBase64(encryptedAesKeyRecipient),
            senderKey: this._arrayBufferToBase64(encryptedAesKeySender),
            iv: this._arrayBufferToBase64(iv),
            data: this._arrayBufferToBase64(encryptedContent)
        });
    }

    /**
     * Decrypt a message using own private key
     * Supports both v1 (recipient-only) and v2 (dual) formats.
     * @param {string} encryptedPayload - JSON string with encrypted data
     * @param {CryptoKey} privateKey - own RSA private key
     * @param {boolean} [isSender=false] - true if decrypting own sent message (uses senderKey)
     */
    async decryptMessage(encryptedPayload, privateKey, isSender = false) {
        try {
            const payload = JSON.parse(encryptedPayload);
            if (payload.v !== 1 && payload.v !== 2) throw new Error('Unsupported encryption version');

            // Pick the right encrypted AES key:
            // v2 sender → use senderKey; otherwise → use key (recipient)
            let encryptedAesKeyB64 = payload.key;
            if (payload.v === 2 && isSender && payload.senderKey) {
                encryptedAesKeyB64 = payload.senderKey;
            }

            const encryptedAesKey = this._base64ToArrayBuffer(encryptedAesKeyB64);
            const rawAesKey = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encryptedAesKey
            );

            const aesKey = await crypto.subtle.importKey(
                'raw',
                rawAesKey,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const iv = this._base64ToArrayBuffer(payload.iv);
            const encryptedContent = this._base64ToArrayBuffer(payload.data);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                encryptedContent
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '🔒 No se pudo descifrar este mensaje';
        }
    }

    // --- INDEXEDDB STORAGE (Private Key) ---

    async _openDB() {
        if (this._db) return this._db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.DB_STORE)) {
                    db.createObjectStore(this.DB_STORE);
                }
            };
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Store private key in IndexedDB (never leaves the browser)
     */
    async storePrivateKey(uid, privateKey) {
        const jwk = await this.exportPrivateKey(privateKey);
        const db = await this._openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.DB_STORE, 'readwrite');
            tx.objectStore(this.DB_STORE).put(jwk, `privateKey_${uid}`);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Load private key from IndexedDB
     */
    async loadPrivateKey(uid) {
        const db = await this._openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.DB_STORE, 'readonly');
            const request = tx.objectStore(this.DB_STORE).get(`privateKey_${uid}`);
            request.onsuccess = async () => {
                if (request.result) {
                    const key = await this.importPrivateKey(request.result);
                    resolve(key);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Check if user has a private key stored
     */
    async hasPrivateKey(uid) {
        const key = await this.loadPrivateKey(uid);
        return key !== null;
    }

    // --- KEY BACKUP ---

    /**
     * Export private key as downloadable JSON file
     */
    async exportKeyBackup(uid) {
        const db = await this._openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.DB_STORE, 'readonly');
            const request = tx.objectStore(this.DB_STORE).get(`privateKey_${uid}`);
            request.onsuccess = () => {
                if (!request.result) {
                    reject(new Error('No private key found'));
                    return;
                }
                const backup = {
                    type: 'pomodoro-chat-key-backup',
                    version: 1,
                    uid: uid,
                    key: request.result,
                    exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pomodoro-key-backup-${uid.slice(0, 6)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Import private key from backup file
     */
    async importKeyBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (backup.type !== 'pomodoro-chat-key-backup') {
                        throw new Error('Invalid backup file');
                    }
                    const privateKey = await this.importPrivateKey(backup.key);
                    await this.storePrivateKey(backup.uid, privateKey);
                    resolve({ uid: backup.uid });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // --- KEY FINGERPRINT ---

    /**
     * Generate a human-readable fingerprint from a public key JWK
     * Returns format like "A3F2-9B1C-D4E7-82FA"
     * @param {Object} publicKeyJwk - JWK format public key
     * @returns {Promise<string>} fingerprint string
     */
    async getKeyFingerprint(publicKeyJwk) {
        try {
            const keyString = JSON.stringify(publicKeyJwk);
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(keyString));
            const hashArray = new Uint8Array(hashBuffer);
            // Take first 8 bytes → 4 hex groups
            const groups = [];
            for (let i = 0; i < 8; i += 2) {
                groups.push(
                    hashArray[i].toString(16).toUpperCase().padStart(2, '0') +
                    hashArray[i + 1].toString(16).toUpperCase().padStart(2, '0')
                );
            }
            return groups.join('-');
        } catch (e) {
            console.error('Fingerprint generation failed:', e);
            return null;
        }
    }

    // --- KEY ROTATION ---

    /**
     * Regenerate the keypair for a user.
     * Stores new private key in IndexedDB, returns new public key JWK.
     * IMPORTANT: Caller must update Firestore with the new publicKey.
     * @param {string} uid
     * @returns {Promise<Object>} new public key JWK
     */
    async regenerateKeys(uid) {
        const keyPair = await this.generateKeyPair();
        await this.storePrivateKey(uid, keyPair.privateKey);
        const publicKeyJwk = await this.exportPublicKey(keyPair.publicKey);
        console.log('🔑 Keypair regenerated for uid:', uid);
        return publicKeyJwk;
    }

    // --- HELPERS ---

    _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    _base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

window.CryptoChat = CryptoChat;
