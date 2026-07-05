/**
 * YouTube Live Streams for Pomodoro Timer
 * Predefined Argentine streaming channels with LIVE indicator
 */

class YouTubeStreams {
    constructor() {
        this.channels = {
            blender: {
                name: '🔴 BLENDER',
                handle: '@estoesblender',
                channelName: 'Blender',
                description: 'Actualidad, humor y entrevistas en vivo',
                color: '#ff4444'
            },
            olga: {
                name: '🔴 OLGA',
                handle: '@olgaenvivo_',
                channelName: 'OLGA',
                description: 'Entretenimiento, música y cultura argentina',
                color: '#ff6b35'
            },
            gelatina: {
                name: '🔴 GELATINA',
                handle: '@SomosGelatina',
                channelName: 'Gelatina',
                description: 'Política, humor y entretenimiento independiente',
                color: '#9b59b6'
            },
            luzu: {
                name: '🔴 LUZU TV',
                handle: '@luzutv',
                channelName: 'Luzu TV',
                description: 'Streaming argentino líder en audiencia',
                color: '#3498db'
            }
        };

        this.currentChannel = null;
        this.isLive = false;
        this._createUI();
    }

    _createUI() {
        // Create live indicator
        this.liveIndicator = document.createElement('div');
        this.liveIndicator.id = 'youtube-live-indicator';
        this.liveIndicator.className = 'youtube-live-indicator hidden';
        this.liveIndicator.innerHTML = `
            <span class="live-dot"></span>
            <span class="live-text">LIVE</span>
            <span class="live-channel"></span>
        `;

        // Create stream info panel
        this.streamPanel = document.createElement('div');
        this.streamPanel.id = 'youtube-stream-panel';
        this.streamPanel.className = 'youtube-stream-panel hidden';
        this.streamPanel.innerHTML = `
            <div class="stream-header">
                <span class="stream-title">📺 Streams en Vivo</span>
                <button id="close-stream-panel" class="stream-close-btn">&times;</button>
            </div>
            <div class="stream-channels"></div>
        `;

        // Insert after music embed container
        const embedContainer = document.getElementById('music-embed-container');
        if (embedContainer) {
            embedContainer.parentNode.insertBefore(this.liveIndicator, embedContainer.nextSibling);
            embedContainer.parentNode.insertBefore(this.streamPanel, this.liveIndicator.nextSibling);
        }

        // Render channels
        const channelsContainer = this.streamPanel.querySelector('.stream-channels');
        Object.entries(this.channels).forEach(([key, channel]) => {
            const card = document.createElement('div');
            card.className = 'stream-channel-card';
            card.dataset.channel = key;
            card.innerHTML = `
                <div class="stream-channel-info">
                    <span class="stream-channel-name" style="color: ${channel.color}">${channel.name}</span>
                    <span class="stream-channel-desc">${channel.description}</span>
                </div>
                <button class="stream-play-btn" data-channel="${key}">▶ Ver</button>
            `;
            channelsContainer.appendChild(card);
        });

        // Bind events
        document.getElementById('close-stream-panel')?.addEventListener('click', () => {
            this.streamPanel.classList.add('hidden');
        });

        channelsContainer.addEventListener('click', (e) => {
            const playBtn = e.target.closest('.stream-play-btn');
            if (playBtn) {
                const channelKey = playBtn.dataset.channel;
                this.playStream(channelKey);
            }
        });

        // Add styles
        this._addStyles();
    }

    _addStyles() {
        if (document.getElementById('youtube-streams-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'youtube-streams-styles';
        styles.textContent = `
            .youtube-live-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background: rgba(255, 0, 0, 0.15);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 20px;
                margin-top: 8px;
                animation: livePulse 2s ease-in-out infinite;
            }

            .youtube-live-indicator.hidden {
                display: none;
            }

            .live-dot {
                width: 8px;
                height: 8px;
                background: #ff0000;
                border-radius: 50%;
                animation: liveDotPulse 1.5s ease-in-out infinite;
            }

            .live-text {
                font-size: 0.75rem;
                font-weight: 700;
                color: #ff0000;
                letter-spacing: 1px;
            }

            .live-channel {
                font-size: 0.8rem;
                color: var(--text-color, #fff);
                opacity: 0.9;
            }

            @keyframes liveDotPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            @keyframes livePulse {
                0%, 100% { border-color: rgba(255, 0, 0, 0.3); }
                50% { border-color: rgba(255, 0, 0, 0.6); }
            }

            .youtube-stream-panel {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 320px;
                max-height: 400px;
                background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.98));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                z-index: 1000;
                overflow: hidden;
            }

            .youtube-stream-panel.hidden {
                display: none;
            }

            .stream-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .stream-title {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--text-color, #fff);
            }

            .stream-close-btn {
                background: none;
                border: none;
                color: var(--text-color, #fff);
                font-size: 1.2rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .stream-close-btn:hover {
                opacity: 1;
            }

            .stream-channels {
                padding: 8px;
                max-height: 340px;
                overflow-y: auto;
            }

            .stream-channel-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .stream-channel-card:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .stream-channel-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .stream-channel-name {
                font-size: 0.9rem;
                font-weight: 600;
            }

            .stream-channel-desc {
                font-size: 0.75rem;
                color: var(--text-color, #fff);
                opacity: 0.6;
            }

            .stream-play-btn {
                background: linear-gradient(135deg, rgba(255, 0, 0, 0.8), rgba(200, 0, 0, 0.9));
                color: white;
                border: none;
                padding: 6px 14px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .stream-play-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(255, 0, 0, 0.4);
            }

            @media (max-width: 768px) {
                .youtube-stream-panel {
                    right: 10px;
                    left: 10px;
                    width: auto;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    playStream(channelKey) {
        const channel = this.channels[channelKey];
        if (!channel) return;

        this.currentChannel = channelKey;
        this.isLive = true;

        // Pause radio player
        const radioPlayer = document.getElementById('radio-player');
        if (radioPlayer && !radioPlayer.paused) {
            radioPlayer.pause();
        }

        // Get embed container
        const embedContainer = document.getElementById('music-embed-container');
        if (!embedContainer) return;

        // Create YouTube embed
        const streamUrl = `https://www.youtube.com/embed/?channel=${channel.handle.replace('@', '')}&autoplay=1&mute=0`;
        embedContainer.innerHTML = `
            <iframe src="${streamUrl}" 
                width="100%" height="200" frameborder="0" 
                allow="autoplay; encrypted-media" allowfullscreen 
                class="music-embed-iframe"
                style="border-radius: 8px;"></iframe>
        `;
        embedContainer.classList.remove('hidden');

        // Show live indicator
        this.liveIndicator.classList.remove('hidden');
        this.liveIndicator.querySelector('.live-channel').textContent = channel.channelName;

        // Update radio status
        const radioStatus = document.getElementById('radio-status');
        if (radioStatus) {
            radioStatus.textContent = `🔴 ${channel.channelName} LIVE`;
        }

        // Save state
        const saveToLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));
        saveToLS('pomodoroLastStation', { key: 'custom', customUrl: streamUrl, embedType: 'youtube', isLive: true, channel: channelKey });

        // Close panel
        this.streamPanel.classList.add('hidden');

        if (window.Toast) {
            Toast.show(`🔴 ${channel.channelName} en vivo`, 'success');
        }
    }

    stopStream() {
        this.currentChannel = null;
        this.isLive = false;

        // Hide live indicator
        this.liveIndicator.classList.add('hidden');

        // Clear embed
        const embedContainer = document.getElementById('music-embed-container');
        if (embedContainer) {
            embedContainer.innerHTML = '';
            embedContainer.classList.add('hidden');
        }
    }

    togglePanel() {
        this.streamPanel.classList.toggle('hidden');
    }

    getChannels() {
        return this.channels;
    }
}

window.YouTubeStreams = YouTubeStreams;
