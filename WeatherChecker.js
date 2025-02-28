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
    this.snowThreshold = 2;
  }
  
  /**
   * Fetches the short-term forecast from the API and returns the raw JSON data.
   * @param {number} [count=6] - The number of forecast periods to retrieve.
   * @returns {Promise<Object>} A promise that resolves with the raw JSON forecast data.
   */
  fetchShortTermForecast(count = 6) {
    const url = `https://weatherapi.pelmorex.com/api/v1/shortterm?locale=${this.locale}&lat=${this.lat}&long=${this.long}&unit=${this.unit}&count=${count}`;
    return $.ajax({
      url: url,
      dataType: 'json'
    });
  }
  
  /**
   * Fetches the long-term forecast from the API and returns the raw JSON data.
   * @param {number} count - The number of forecast periods to retrieve.
   * @param {number} [offset=0] - The offset from the beginning of the forecast data.
   * @returns {Promise<Object>} A promise that resolves with the raw JSON forecast data.
   */
  fetchLongTermForecast(count, offset = 0) {
    const url = `https://weatherapi.pelmorex.com/api/v1/longterm?locale=${this.locale}&lat=${this.lat}&long=${this.long}&unit=${this.unit}&count=${count}&offset=${offset}`;
    return $.ajax({
      url: url,
      dataType: 'json'
    });
  }
  
  /**
   * Evaluates the short-term forecast data.
   * @param {Object} data - Raw JSON data from the short-term forecast API.
   * @returns {Object} An object with evaluation results.
   */
  evaluateShortTermForecast(data) {
    const conditions = {
      totalSnow: 0,
      significantSnow: false,
      hailDetected: false,
      weatherAlert: false
    };
    if (data.shortTerm && Array.isArray(data.shortTerm)) {
      data.shortTerm.forEach(forecast => {
        if (forecast.snow && typeof forecast.snow.value === 'number') {
          conditions.totalSnow += forecast.snow.value;
        }
        if (forecast.hail === true) {
          conditions.hailDetected = true;
        }
      });
    }
    if (conditions.totalSnow > this.snowThreshold) {
      conditions.significantSnow = true;
    }
    if (data.weatherAlert && Array.isArray(data.weatherAlert) && data.weatherAlert.length > 0) {
      conditions.weatherAlert = true;
    }
    return conditions;
  }
  
  /**
   * Evaluates the long-term forecast data.
   * @param {Object} data - Raw JSON data from the long-term forecast API.
   * @returns {Object} An object with evaluation results and period details.
   */
  evaluateLongTermForecast(data) {
    const conditions = {
      totalSnow: 0,
      significantSnow: false,
      hailDetected: false,
      weatherAlert: false,
      periods: []  // Detailed forecast data for each period.
    };
    if (data.longTerm && Array.isArray(data.longTerm)) {
      data.longTerm.forEach(forecast => {
        if (forecast.snow && typeof forecast.snow.value === 'number') {
          conditions.totalSnow += forecast.snow.value;
        }
        if (forecast.hail === true) {
          conditions.hailDetected = true;
        }
        // Build detailed period data.
        conditions.periods.push({
          precipitationPercentage: forecast.pop || forecast.precipitationPercentage || 0,
          precipitationType: forecast.weatherCode ? forecast.weatherCode.text : "N/A",
          precipitationQuantity: forecast.rain && typeof forecast.rain.value === 'number' ? forecast.rain.value : 0,
          temperature: forecast.temperature ? forecast.temperature.value : "N/A",
          feelsLike: forecast.feelsLike || "N/A"
        });
      });
    }
    if (conditions.totalSnow > this.snowThreshold) {
      conditions.significantSnow = true;
    }
    if (data.weatherAlert && Array.isArray(data.weatherAlert) && data.weatherAlert.length > 0) {
      conditions.weatherAlert = true;
    }
    return conditions;
  }
}
