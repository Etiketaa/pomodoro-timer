/**
 * YouTube Live Streams for Pomodoro Timer
 * Integrates Argentine streaming channels into the music player
 */

const YOUTUBE_CHANNELS = {
    blender: {
        name: '🔴 BLENDER (En Vivo)',
        handle: 'estoesblender',
        channelName: 'Blender',
        embedUrl: 'https://www.youtube.com/embed/?channel=estoesblender&autoplay=1'
    },
    olga: {
        name: '🔴 OLGA (En Vivo)',
        handle: 'olgaenvivo_',
        channelName: 'OLGA',
        embedUrl: 'https://www.youtube.com/embed/?channel=olgaenvivo_&autoplay=1'
    },
    gelatina: {
        name: '🔴 GELATINA (En Vivo)',
        handle: 'SomosGelatina',
        channelName: 'Gelatina',
        embedUrl: 'https://www.youtube.com/embed/?channel=SomosGelatina&autoplay=1'
    },
    luzu: {
        name: '🔴 LUZU TV (En Vivo)',
        handle: 'luzutv',
        channelName: 'Luzu TV',
        embedUrl: 'https://www.youtube.com/embed/?channel=luzutv&autoplay=1'
    }
};

function loadYouTubeLive(channelKey) {
    const channel = YOUTUBE_CHANNELS[channelKey];
    if (!channel) return;

    const radioPlayer = document.getElementById('radio-player');
    if (radioPlayer && !radioPlayer.paused) {
        radioPlayer.pause();
    }

    const embedContainer = document.getElementById('music-embed-container');
    if (!embedContainer) return;

    embedContainer.innerHTML = `
        <iframe src="${channel.embedUrl}"
            width="100%" height="170" frameborder="0"
            allow="autoplay; encrypted-media" allowfullscreen
            class="music-embed-iframe"
            style="border-radius: 8px;"></iframe>
    `;
    embedContainer.classList.remove('hidden');

    const liveIndicator = document.getElementById('live-indicator');
    if (liveIndicator) {
        liveIndicator.classList.remove('hidden');
        liveIndicator.querySelector('.live-channel-name').textContent = channel.channelName;
    }
}

function stopYouTubeLive() {
    const embedContainer = document.getElementById('music-embed-container');
    if (embedContainer) {
        embedContainer.classList.add('hidden');
        embedContainer.innerHTML = '';
    }

    const liveIndicator = document.getElementById('live-indicator');
    if (liveIndicator) {
        liveIndicator.classList.add('hidden');
    }
}

function createLiveIndicator() {
    if (document.getElementById('live-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'live-indicator';
    indicator.className = 'live-indicator hidden';
    indicator.innerHTML = `
        <span class="live-dot"></span>
        <span class="live-label">LIVE</span>
        <span class="live-channel-name"></span>
    `;

    const embedContainer = document.getElementById('music-embed-container');
    if (embedContainer && embedContainer.parentNode) {
        embedContainer.parentNode.insertBefore(indicator, embedContainer.nextSibling);
    }

    // Add styles once
    if (!document.getElementById('live-indicator-styles')) {
        const styles = document.createElement('style');
        styles.id = 'live-indicator-styles';
        styles.textContent = `
            .live-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 12px;
                margin-top: 6px;
                font-size: 0.75rem;
                background: rgba(255, 0, 0, 0.12);
                border: 1px solid rgba(255, 0, 0, 0.25);
            }
            .live-indicator.hidden { display: none; }
            .live-dot {
                width: 6px; height: 6px;
                background: #ff0000;
                border-radius: 50%;
                animation: livePulse 1.5s ease-in-out infinite;
            }
            .live-label {
                font-weight: 700;
                color: #ff0000;
                letter-spacing: 0.5px;
            }
            .live-channel-name {
                color: var(--text-color, #fff);
                opacity: 0.85;
                margin-left: 2px;
            }
            @keyframes livePulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.3); }
            }
        `;
        document.head.appendChild(styles);
    }
}
