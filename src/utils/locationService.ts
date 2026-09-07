export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationInfo {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  displayName: string;
  coordinates: GeoCoordinates;
  source?: 'device' | 'cached' | 'ip_network' | 'timezone_inferred';
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  weatherCode: number;
  locationName: string;
  forecast?: Array<{
    date: string;
    condition: string;
    maxTemp: number;
    minTemp: number;
  }>;
}

export interface NearbyPlace {
  name: string;
  category: string;
  address: string;
  distanceKm?: number;
  mapsUrl: string;
  coordinates: GeoCoordinates;
}

const WMO_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

class LocationService {
  private cachedLocation: LocationInfo | null = null;
  private lastFetchedTimestamp: number = 0;

  getTimezoneFallback(): LocationInfo {
    const tz = (Intl?.DateTimeFormat?.().resolvedOptions()?.timeZone || '').toLowerCase();

    // Regional timezone approximations
    if (tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('india')) {
      return {
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
        displayName: 'Ahmedabad, Gujarat, India',
        coordinates: { latitude: 23.0225, longitude: 72.5714 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('new_york') || tz.includes('eastern')) {
      return {
        city: 'New York',
        state: 'NY',
        country: 'United States',
        displayName: 'New York, NY, United States',
        coordinates: { latitude: 40.7128, longitude: -74.006 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('chicago') || tz.includes('central')) {
      return {
        city: 'Chicago',
        state: 'IL',
        country: 'United States',
        displayName: 'Chicago, IL, United States',
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('los_angeles') || tz.includes('pacific')) {
      return {
        city: 'Los Angeles',
        state: 'CA',
        country: 'United States',
        displayName: 'Los Angeles, CA, United States',
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('london')) {
      return {
        city: 'London',
        state: 'England',
        country: 'United Kingdom',
        displayName: 'London, England, United Kingdom',
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('dubai')) {
      return {
        city: 'Dubai',
        state: 'Dubai',
        country: 'United Arab Emirates',
        displayName: 'Dubai, United Arab Emirates',
        coordinates: { latitude: 25.2048, longitude: 55.2708 },
        source: 'timezone_inferred',
      };
    }
    if (tz.includes('tokyo')) {
      return {
        city: 'Tokyo',
        state: 'Tokyo',
        country: 'Japan',
        displayName: 'Tokyo, Japan',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        source: 'timezone_inferred',
      };
    }

    // Default culturally-aligned baseline for MERY (M4 assistant)
    return {
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      displayName: 'Ahmedabad, Gujarat, India',
      coordinates: { latitude: 23.0225, longitude: 72.5714 },
      source: 'timezone_inferred',
    };
  }

  async requestPermissionAndGetCoords(timeoutMs: number = 3500): Promise<GeoCoordinates> {
    if (!navigator?.geolocation) {
      throw new Error('Geolocation is not supported by your browser or device.');
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error('Location request timed out.'));
        }
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          const coords: GeoCoordinates = {
            latitude: Number(pos.coords.latitude.toFixed(4)),
            longitude: Number(pos.coords.longitude.toFixed(4)),
            accuracy: Math.round(pos.coords.accuracy),
          };
          try {
            localStorage.setItem('mery_last_coords', JSON.stringify(coords));
          } catch {}
          resolve(coords);
        },
        (err) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          if (err.code === err.PERMISSION_DENIED) {
            reject(new Error('Location permission was denied.'));
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reject(new Error('Location information is currently unavailable.'));
          } else if (err.code === err.TIMEOUT) {
            reject(new Error('Location request timed out.'));
          } else {
            reject(new Error(err.message || 'Unable to retrieve location.'));
          }
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 }
      );
    });
  }

  async getLocationWithFallback(): Promise<LocationInfo> {
    // 1. Try Hardware / Browser GPS position
    try {
      const coords = await this.requestPermissionAndGetCoords(3500);
      const info = await this.getReverseGeocode(coords.latitude, coords.longitude);
      const resInfo: LocationInfo = { ...info, source: 'device' };
      this.cachedLocation = resInfo;
      try {
        localStorage.setItem('mery_cached_location', JSON.stringify(resInfo));
      } catch {}
      return resInfo;
    } catch (gpsErr) {
      console.log('[LocationService] Browser GPS prompt unavailable or timed out, evaluating fallback tiers:', gpsErr);
    }

    // 2. Try Memory or LocalStorage Cache if fresh
    if (this.cachedLocation && Date.now() - this.lastFetchedTimestamp < 3600000) {
      return { ...this.cachedLocation, source: 'cached' };
    }

    try {
      const stored = localStorage.getItem('mery_cached_location');
      if (stored) {
        const parsed = JSON.parse(stored) as LocationInfo;
        if (parsed?.coordinates?.latitude && parsed?.coordinates?.longitude) {
          return { ...parsed, source: 'cached' };
        }
      }
    } catch {}

    // 3. Try Server-Side IP Geolocation / Public IP Geolocation
    try {
      const serverRes = await fetch('/api/location', {
        signal: AbortSignal.timeout(3500),
      });
      if (serverRes.ok) {
        const ipData = await serverRes.json();
        if (ipData?.latitude && ipData?.longitude) {
          const resInfo: LocationInfo = {
            city: ipData.city,
            state: ipData.state,
            country: ipData.country,
            displayName: ipData.displayName || `${ipData.city}, ${ipData.country}`,
            coordinates: {
              latitude: Number(ipData.latitude),
              longitude: Number(ipData.longitude),
            },
            source: 'ip_network',
          };
          this.cachedLocation = resInfo;
          this.lastFetchedTimestamp = Date.now();
          try {
            localStorage.setItem('mery_cached_location', JSON.stringify(resInfo));
          } catch {}
          return resInfo;
        }
      }
    } catch (ipErr) {
      console.log('[LocationService] Server IP lookup bypass:', ipErr);
    }

    // 4. Try Direct Public Free IP Service
    try {
      const directIpRes = await fetch('https://freeipapi.com/api/json', {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'MERY-AI-Assistant/2.0' },
      });
      if (directIpRes.ok) {
        const ipData = await directIpRes.json();
        if (ipData?.latitude && ipData?.longitude) {
          const resInfo: LocationInfo = {
            city: ipData.cityName || 'Local Area',
            state: ipData.regionName || '',
            country: ipData.countryName || '',
            displayName: `${ipData.cityName || 'Local Area'}${ipData.regionName ? `, ${ipData.regionName}` : ''}${ipData.countryName ? `, ${ipData.countryName}` : ''}`,
            coordinates: {
              latitude: Number(ipData.latitude),
              longitude: Number(ipData.longitude),
            },
            source: 'ip_network',
          };
          this.cachedLocation = resInfo;
          this.lastFetchedTimestamp = Date.now();
          return resInfo;
        }
      }
    } catch {}

    // 5. Ultimate Infallible Tier: Regional Timezone Inference
    const tzFallback = this.getTimezoneFallback();
    this.cachedLocation = tzFallback;
    this.lastFetchedTimestamp = Date.now();
    return tzFallback;
  }

  async getReverseGeocode(lat: number, lon: number): Promise<LocationInfo> {
    // Return cache if within 10 minutes
    if (
      this.cachedLocation &&
      Date.now() - this.lastFetchedTimestamp < 600000 &&
      Math.abs(this.cachedLocation.coordinates.latitude - lat) < 0.05 &&
      Math.abs(this.cachedLocation.coordinates.longitude - lon) < 0.05
    ) {
      return this.cachedLocation;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'User-Agent': 'MERY-AI-Assistant/2.0 (mery-applet@local.ai)',
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (!res.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Local Area';
      const state = addr.state || addr.region || '';
      const country = addr.country || '';

      const locationInfo: LocationInfo = {
        city,
        state,
        country,
        displayName: `${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`,
        coordinates: { latitude: lat, longitude: lon },
      };

      this.cachedLocation = locationInfo;
      this.lastFetchedTimestamp = Date.now();
      return locationInfo;
    } catch {
      return {
        displayName: `Coordinates (${lat}, ${lon})`,
        coordinates: { latitude: lat, longitude: lon },
      };
    }
  }

  async getCoordinatesForCity(cityName: string): Promise<GeoCoordinates & { displayName: string }> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'MERY-AI-Assistant/2.0 (mery-applet@local.ai)',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to locate city "${cityName}"`);
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      throw new Error(`Could not find coordinates for city: "${cityName}"`);
    }

    const item = data[0];
    return {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
    };
  }

  async getWeather(cityOrQuery?: string): Promise<WeatherData> {
    let lat: number;
    let lon: number;
    let locationName = 'Current Location';

    if (cityOrQuery && cityOrQuery.trim()) {
      const geo = await this.getCoordinatesForCity(cityOrQuery.trim());
      lat = geo.latitude;
      lon = geo.longitude;
      locationName = geo.displayName.split(',')[0] || cityOrQuery;
    } else {
      const loc = await this.getLocationWithFallback();
      lat = loc.coordinates.latitude;
      lon = loc.coordinates.longitude;
      locationName = loc.displayName;
    }

    // Call Open-Meteo free API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const res = await fetch(weatherUrl);
    if (!res.ok) {
      throw new Error('Open-Meteo weather service error.');
    }

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const condition = WMO_CODE_MAP[current.weather_code] || 'Fair';

    const forecast: Array<{ date: string; condition: string; maxTemp: number; minTemp: number }> = [];
    if (daily.time && Array.isArray(daily.time)) {
      for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
        forecast.push({
          date: daily.time[i],
          condition: WMO_CODE_MAP[daily.weather_code?.[i]] || 'Clear',
          maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
          minTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        });
      }
    }

    return {
      temperature: Math.round(current.temperature_2m ?? 0),
      apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      precipitation: current.precipitation ?? 0,
      condition,
      weatherCode: current.weather_code ?? 0,
      locationName,
      forecast,
    };
  }

  async searchNearby(query: string): Promise<NearbyPlace[]> {
    const loc = await this.getLocationWithFallback();
    const coords = loc.coordinates;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&lat=${coords.latitude}&lon=${coords.longitude}&format=json&limit=5`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MERY-AI-Assistant/2.0 (mery-applet@local.ai)',
      },
    });

    if (!res.ok) {
      throw new Error('Place search service error.');
    }

    const data: any[] = await res.json();
    return data.map((item) => {
      const pLat = parseFloat(item.lat);
      const pLon = parseFloat(item.lon);
      const dist = this.calculateDistance(coords.latitude, coords.longitude, pLat, pLon);

      return {
        name: item.name || item.display_name.split(',')[0],
        category: item.type || item.class || 'place',
        address: item.display_name,
        distanceKm: Math.round(dist * 10) / 10,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.display_name)}`,
        coordinates: { latitude: pLat, longitude: pLon },
      };
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const locationService = new LocationService();
