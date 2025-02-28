import WeatherConditions from './WeatherConditions.js';

export default class WeatherChecker {
  /**
   * Creates a new WeatherChecker instance.
   * @param {number} lat - Latitude for the weather query.
   * @param {number} long - Longitude for the weather query.
   * @param {string} [locale='en-CA'] - Locale for the weather query.
   * @param {string} [unit='metric'] - Unit system for the weather query.
   */
  constructor(lat, long, locale = 'en-CA', unit = 'metric') {
    this.lat = lat;
    this.long = long;
    this.locale = locale;
    this.unit = unit;
    // Snow threshold (in cm) for warnings.
    this.SNOW_THRESHOLD = 2;
  }

  /**
   * Fetches forecast data from the API.
   * @param {string} type - The type of forecast ('shortterm' or 'longterm').
   * @param {number} count - The number of forecast periods to retrieve.
   * @param {number} [offset=0] - The offset from the beginning of the forecast data (only for long-term).
   * @returns {Promise<Object>} A promise that resolves with the raw JSON forecast data.
   */
  fetchForecast(type, count, offset = 0) {
    const url = `https://weatherapi.pelmorex.com/api/v1/${type}?locale=${this.locale}&lat=${this.lat}&long=${this.long}&unit=${this.unit}&count=${count}&offset=${offset}`;
    return $.ajax({
      url: url,
      dataType: 'json'
    }).fail((jqXHR, textStatus, errorThrown) => {
      console.error(`Error fetching ${type} forecast: ${textStatus}`, errorThrown);
    });
  }

  fetchShortTermForecast(count = 6) {
    return this.fetchForecast('shortterm', count);
  }

  fetchLongTermForecast(count, offset = 0) {
    return this.fetchForecast('longterm', count, offset);
  }

  /**
   * Evaluates the short-term forecast data.
   * @param {Object} data - Raw JSON data from the short-term forecast API.
   * @returns {WeatherConditions} An object with evaluation results and display unit information.
   */
  evaluateShortTermForecast(data) {
    const conditions = new WeatherConditions();
    if (data.shortTerm && Array.isArray(data.shortTerm)) {
      data.shortTerm.forEach(forecast => {
        this.evaluateForecast(forecast, conditions);
      });
    }
    this.checkSignificantSnow(conditions);
    this.checkWeatherAlert(data, conditions);
    conditions.display = (data.shortTerm && data.shortTerm.display) ? data.shortTerm.display : {};
    return conditions;
  }

  /**
   * Evaluates the long-term forecast data.
   * @param {Object} data - Raw JSON data from the long-term forecast API.
   * @returns {WeatherConditions} An object with evaluation results, detailed period information, and display unit info.
   */
  evaluateLongTermForecast(data) {
    const conditions = new WeatherConditions();
    if (data.longTerm && Array.isArray(data.longTerm)) {
      data.longTerm.forEach(forecast => {
        this.evaluateForecast(forecast, conditions);
        conditions.periods.push(this.extractPeriodData(forecast));
      });
    }
    this.checkSignificantSnow(conditions);
    this.checkWeatherAlert(data, conditions);
    conditions.display = (data.longTerm && data.longTerm.display) ? data.longTerm.display : {};
    if (data.longTerm && data.longTerm.specialWeatherStatement) {
      conditions.specialWeatherStatement = data.longTerm.specialWeatherStatement;
    }
    return conditions;
  }

  evaluateForecast(forecast, conditions) {
    if (forecast.snow && typeof forecast.snow.value === 'number') {
      conditions.totalSnow += forecast.snow.value;
    }
    if (forecast.hail === true) {
      conditions.hailDetected = true;
    }
  }

  extractPeriodData(forecast) {
    return {
      precipitationPercentage: forecast.pop || forecast.precipitationPercentage || 0,
      precipitationType: forecast.weatherCode ? forecast.weatherCode.text : "N/A",
      precipitationQuantity: (forecast.rain && typeof forecast.rain.value === 'number') ? forecast.rain.value : 0,
      temperature: forecast.temperature ? forecast.temperature.value : "N/A",
      feelsLike: forecast.feelsLike || "N/A"
    };
  }

  checkSignificantSnow(conditions) {
    if (conditions.totalSnow > this.SNOW_THRESHOLD) {
      conditions.significantSnow = true;
    }
  }

  checkWeatherAlert(data, conditions) {
    if (data.weatherAlert && Array.isArray(data.weatherAlert) && data.weatherAlert.length > 0) {
      conditions.weatherAlert = true;
    }
  }
}
