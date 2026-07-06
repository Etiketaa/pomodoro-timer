<script lang="ts">
  type WeatherData = {
    temp: number;
    condition: string;
    icon: string;
    location: string;
    humidity: number;
    windSpeed: number;
  } | null;

  let weather = $state<WeatherData>(null);
  let loading = $state(true);
  let error = $state('');

  const WEATHER_CONDITIONS: Record<string, { icon: string; color: string }> = {
    clear: { icon: 'sun', color: 'var(--primary)' },
    'partly-cloudy': { icon: 'cloud-sun', color: 'var(--accent-blue)' },
    cloudy: { icon: 'cloud', color: 'var(--text-muted)' },
    rain: { icon: 'cloud-rain', color: 'var(--accent-blue)' },
    storm: { icon: 'cloud-lightning', color: 'var(--accent-purple)' },
    snow: { icon: 'cloud-snow', color: 'var(--text-muted)' },
    fog: { icon: 'cloud-fog', color: 'var(--text-muted)' },
  };

  import { onMount } from 'svelte';

  onMount(async () => {
    try {
      // Use mock data for now — real API integration can come later
      const mockConditions = Object.keys(WEATHER_CONDITIONS);
      const condition = mockConditions[Math.floor(Math.random() * 4)];

      weather = {
        temp: 22 + Math.round(Math.random() * 10),
        condition,
        icon: WEATHER_CONDITIONS[condition].icon,
        location: 'Buenos Aires',
        humidity: 45 + Math.round(Math.random() * 30),
        windSpeed: 5 + Math.round(Math.random() * 15),
      };
    } catch {
      error = 'Unable to load weather';
    } finally {
      loading = false;
    }
  });
</script>

<div class="card flex flex-col gap-3">
  <div class="flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <h3 class="text-sm font-semibold text-text">Weather</h3>
  </div>

  {#if loading}
    <div class="animate-pulse space-y-3">
      <div class="h-8 bg-border/30 rounded-lg"></div>
      <div class="h-4 bg-border/20 rounded w-2/3"></div>
      <div class="h-4 bg-border/20 rounded w-1/2"></div>
    </div>
  {:else if error}
    <p class="text-text-muted text-sm">{error}</p>
  {:else if weather}
    <div class="flex items-center justify-between">
      <div>
        <span class="text-3xl font-bold text-text">{weather.temp}°C</span>
        <p class="text-text-muted text-sm capitalize mt-0.5">{weather.condition.replace('-', ' ')}</p>
      </div>
      <div class="text-5xl opacity-30" style="color: {WEATHER_CONDITIONS[weather.condition].color};">
        <!-- Icon placeholder -->
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          {#if weather.condition === 'clear'}
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          {:else if weather.condition === 'partly-cloudy'}
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          {:else if weather.condition === 'cloudy'}
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          {:else if weather.condition === 'rain'}
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            <line x1="8" y1="19" x2="8" y2="16"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="19" x2="16" y2="16"/>
          {:else}
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          {/if}
        </svg>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 mt-1">
      <div class="glass rounded-lg p-2 text-center">
        <p class="text-text-muted text-[10px] uppercase">Humidity</p>
        <p class="text-text text-sm font-semibold">{weather.humidity}%</p>
      </div>
      <div class="glass rounded-lg p-2 text-center">
        <p class="text-text-muted text-[10px] uppercase">Wind</p>
        <p class="text-text text-sm font-semibold">{weather.windSpeed} km/h</p>
      </div>
    </div>

    <p class="text-text-muted text-xs text-center mt-1">{weather.location}</p>
  {/if}
</div>