/**
 * Lightweight, permission-free weather forecast utility using IP geolocation and Open-Meteo.
 */

export interface WeatherInfo {
  temp: number;
  symbol: string;
  description: string;
  code: number;
}

const weatherCodes: Record<number, { symbol: string; desc: string }> = {
  0: { symbol: "☀️", desc: "Clear" },
  1: { symbol: "🌤️", desc: "Mostly Clear" },
  2: { symbol: "⛅", desc: "Partly Cloudy" },
  3: { symbol: "☁️", desc: "Cloudy" },
  45: { symbol: "🌫️", desc: "Foggy" },
  48: { symbol: "🌫️", desc: "Foggy" },
  51: { symbol: "🌧️", desc: "Drizzle" },
  53: { symbol: "🌧️", desc: "Drizzle" },
  55: { symbol: "🌧️", desc: "Drizzle" },
  61: { symbol: "🌧️", desc: "Light Rain" },
  63: { symbol: "🌧️", desc: "Rainy" },
  65: { symbol: "🌧️", desc: "Heavy Rain" },
  71: { symbol: "❄️", desc: "Light Snow" },
  73: { symbol: "❄️", desc: "Snowy" },
  75: { symbol: "❄️", desc: "Heavy Snow" },
  77: { symbol: "❄️", desc: "Snowy" },
  80: { symbol: "🌧️", desc: "Rain Showers" },
  81: { symbol: "🌧️", desc: "Rain Showers" },
  82: { symbol: "🌧️", desc: "Rain Storm" },
  85: { symbol: "❄️", desc: "Snow Showers" },
  86: { symbol: "❄️", desc: "Snow Showers" },
  95: { symbol: "⛈️", desc: "Thunderstorm" },
};

export async function fetchCurrentWeather(): Promise<WeatherInfo> {
  try {
    // 1. IP lookup for latitude, longitude, and city (avoiding annoying browser GPS permission dialogs)
    const ipRes = await fetch("https://ipapi.co/json/");
    if (!ipRes.ok) throw new Error("IP lookup failed");
    const ipData = await ipRes.json();
    const { latitude, longitude, city } = ipData;

    if (!latitude || !longitude) throw new Error("Coordinates missing");

    // 2. Query open-meteo for actual current weather forecast
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!weatherRes.ok) throw new Error("Weather forecast query failed");
    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;

    const code = current.weathercode;
    const lookup = weatherCodes[code] || { symbol: "☀️", desc: "Clear" };

    return {
      temp: Math.round(current.temperature),
      symbol: lookup.symbol,
      description: `${lookup.desc}, ${current.temperature}°C in ${city || "your area"}`,
      code,
    };
  } catch (err) {
    console.warn("Could not retrieve real-time weather forecast, using seasonal fallback:", err);
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 19;
    return {
      temp: 20,
      symbol: isNight ? "🌙" : "☀️",
      description: isNight ? "Clear Night, 20°C" : "Clear Sky, 20°C",
      code: 0,
    };
  }
}
