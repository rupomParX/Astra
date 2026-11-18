module.exports = {
  config: {
    name: "weather",
    platform: "matrix",
    aliases: [],
    version: "2.0",
    author: "Matrix Bot",
    countDown: 5,
    role: 0,
    description: { en: "Get current weather for a location" },
    category: "utility",
    guide: { en: "{pn} <city>" }
  },

  onStart: async function ({ args, message, prefix }) {
    const location = args.join(" ").trim();
    if (!location) return message.reply(`Usage: ${prefix}weather <city>`);

    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.search = new URLSearchParams({ name: location, count: "1", language: "en", format: "json" });
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error(`Geocoding service returned HTTP ${geoResponse.status}`);
    const geo = await geoResponse.json();
    const place = geo.results?.[0];
    if (!place) return message.reply(`Location not found: ${location}`);

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min",
      forecast_days: "1",
      timezone: "auto"
    });
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) throw new Error(`Weather service returned HTTP ${forecastResponse.status}`);
    const forecast = await forecastResponse.json();
    const current = forecast.current;
    const daily = forecast.daily;
    if (!current || !daily?.temperature_2m_max?.length || !daily?.temperature_2m_min?.length) {
      throw new Error("Weather service returned incomplete data");
    }

    return message.reply(
      `Weather for ${place.name}${place.country ? `, ${place.country}` : ""}\n` +
      `Now: ${current.temperature_2m}°C (feels like ${current.apparent_temperature}°C)\n` +
      `Today: ${daily.temperature_2m_min[0]}°C – ${daily.temperature_2m_max[0]}°C\n` +
      `Humidity: ${current.relative_humidity_2m}% · Wind: ${current.wind_speed_10m} km/h`
    );
  }
};
