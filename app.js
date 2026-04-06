(function () {
  var WMO = {
    0:  { emoji: '\u2600\uFE0F', desc: 'Clear' },
    1:  { emoji: '\uD83C\uDF24\uFE0F', desc: 'Mainly clear' },
    2:  { emoji: '\u26C5', desc: 'Partly cloudy' },
    3:  { emoji: '\u2601\uFE0F', desc: 'Overcast' },
    45: { emoji: '\uD83C\uDF2B\uFE0F', desc: 'Foggy' },
    48: { emoji: '\uD83C\uDF2B\uFE0F', desc: 'Icy fog' },
    51: { emoji: '\uD83C\uDF26\uFE0F', desc: 'Light drizzle' },
    53: { emoji: '\uD83C\uDF26\uFE0F', desc: 'Drizzle' },
    55: { emoji: '\uD83C\uDF26\uFE0F', desc: 'Drizzle' },
    61: { emoji: '\uD83C\uDF27\uFE0F', desc: 'Light rain' },
    63: { emoji: '\uD83C\uDF27\uFE0F', desc: 'Rain' },
    65: { emoji: '\uD83C\uDF27\uFE0F', desc: 'Heavy rain' },
    71: { emoji: '\uD83C\uDF28\uFE0F', desc: 'Light snow' },
    73: { emoji: '\uD83C\uDF28\uFE0F', desc: 'Snowfall' },
    75: { emoji: '\u2744\uFE0F', desc: 'Heavy snow' },
    77: { emoji: '\uD83C\uDF28\uFE0F', desc: 'Snow grains' },
    80: { emoji: '\uD83C\uDF27\uFE0F', desc: 'Showers' },
    81: { emoji: '\uD83C\uDF27\uFE0F', desc: 'Heavy showers' },
    82: { emoji: '\u26C8\uFE0F', desc: 'Violent showers' },
    85: { emoji: '\uD83C\uDF28\uFE0F', desc: 'Snow showers' },
    86: { emoji: '\uD83C\uDF28\uFE0F', desc: 'Heavy snow showers' },
    95: { emoji: '\u26C8\uFE0F', desc: 'Thunderstorm' },
    96: { emoji: '\u26C8\uFE0F', desc: 'Thunderstorm' },
    99: { emoji: '\u26C8\uFE0F', desc: 'Severe storm' }
  };

  var forecastOpen = false;
  var loadingEl = document.getElementById('weather-loading');
  var errorEl = document.getElementById('weather-error');
  var forecastToggleEl = document.getElementById('weather-forecast-toggle');
  var forecastWrapEl = document.getElementById('weather-forecast');
  var forecastListEl = document.getElementById('weather-forecast-list');

  function show(id) { document.getElementById(id).style.display = ''; }
  function hide(id) { document.getElementById(id).style.display = 'none'; }

  function setForecastOpen(open) {
    forecastOpen = !!open;
    forecastWrapEl.style.display = forecastOpen ? '' : 'none';
    forecastToggleEl.classList.toggle('active', forecastOpen);
    forecastToggleEl.setAttribute('aria-expanded', String(forecastOpen));
  }

  function dayName(isoDate) {
    var d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function renderForecast(daily) {
    var times = daily.time || [];
    var maxes = daily.temperature_2m_max || [];
    var mins = daily.temperature_2m_min || [];
    var codes = daily.weather_code || [];
    var rows = [];
    var i;

    for (i = 1; i <= 5; i += 1) {
      if (!times[i]) break;
      rows.push(
        '<li class="weather-forecast-item">' +
          '<span class="weather-forecast-day">' + dayName(times[i]) + '</span>' +
          '<span class="weather-forecast-main">' +
            '<span>' + ((WMO[codes[i]] && WMO[codes[i]].emoji) || '\uD83C\uDF21\uFE0F') + '</span>' +
            '<span>' + ((WMO[codes[i]] && WMO[codes[i]].desc) || 'Weather') + '</span>' +
          '</span>' +
          '<span class="weather-forecast-temps">' + Math.round(maxes[i]) + '\u00B0 / ' + Math.round(mins[i]) + '\u00B0</span>' +
        '</li>'
      );
    }

    forecastListEl.innerHTML = rows.join('');
    forecastToggleEl.disabled = rows.length === 0;
  }

  function onError(message) {
    errorEl.textContent = message || '\uD83D\uDCCD Location unavailable';
    hide('weather-loading');
    hide('weather-content');
    setForecastOpen(false);
    show('weather-error');
  }

  function isPermissionDenied(err) {
    if (!err) return false;
    var code = err.code;
    var deniedCode = err.PERMISSION_DENIED;
    var msg = (err.message || '').toLowerCase();
    return code === 1 || code === deniedCode || /denied|permission/.test(msg);
  }

  function fetchWeather(lat, lon) {
    loadingEl.innerHTML = '<span class="weather-spinner"></span>Loading weather\u2026';
    forecastToggleEl.disabled = true;
    forecastListEl.innerHTML = '';
    setForecastOpen(false);

    fetch(
      'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&forecast_days=6' +
      '&temperature_unit=fahrenheit&timezone=auto'
    )
      .then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.current) throw new Error('missing weather payload');

        var temp = Math.round(data.current.temperature_2m);
        var code = data.current.weather_code;
        var cond = WMO[code] || { emoji: '\uD83C\uDF21\uFE0F', desc: 'Unknown' };
        var tz = (data.timezone || '').split('/').pop().replace(/_/g, ' ');

        document.getElementById('weather-emoji').textContent = cond.emoji;
        document.getElementById('weather-temp').textContent = temp;
        document.getElementById('weather-desc').textContent = cond.desc;
        document.getElementById('weather-loc').textContent = tz;
        renderForecast(data.daily || {});

        hide('weather-loading');
        show('weather-content');
        hide('weather-error');
      })
      .catch(function () { onError(); });
  }

  forecastToggleEl.addEventListener('click', function () {
    if (forecastToggleEl.disabled) return;
    setForecastOpen(!forecastOpen);
  });

  if (!navigator.geolocation) {
    onError('\uD83D\uDCCD Enable location to see your weather.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) { fetchWeather(pos.coords.latitude, pos.coords.longitude); },
    function (err) {
      if (isPermissionDenied(err)) {
        onError('\uD83D\uDCCD Enable location to see your weather.');
        return;
      }

      if (err && err.code === 3) {
        onError('\uD83D\uDCCD Location timed out. Please refresh to try again.');
        return;
      }

      onError();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
}());
