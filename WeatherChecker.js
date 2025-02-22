// WeatherChecker.js

// Ensure jQuery is loaded in your project before using this module.

class WeatherChecker {
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
      // The threshold (in cm) for significant snow. This value can be modified as needed.
      this.snowThreshold = 2;
    }
  
    /**
     * Performs an AJAX request to fetch the short-term weather forecast.
     *
     * @param {number} count - The number of forecast periods to retrieve.
     *                         Note: Each "forecast period" is a discrete time interval defined by the API,
     *                         and does not necessarily represent a full day.
     * @returns {Promise<Object>} A promise that resolves with the evaluated weather conditions.
     */
    fetchShortTermForecast(count = 6) {
      const url = `https://weatherapi.pelmorex.com/api/v1/shortterm?locale=${this.locale}&lat=${this.lat}&long=${this.long}&unit=${this.unit}&count=${count}`;
      const self = this;
      return $.ajax({
        url: url,
        dataType: 'json'
      }).then(function(response) {
        const conditions = self.evaluateShortTermForecast(response);
        return conditions;
      }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error fetching short-term weather data:", textStatus, errorThrown);
        return $.Deferred().reject(jqXHR, textStatus, errorThrown).promise();
      });
    }
  
    /**
     * Performs an AJAX request to fetch the long-term weather forecast.
     *
     * @param {number} count - The number of forecast periods to retrieve.
     *                         Note: Each "forecast period" is a discrete interval defined by the API,
     *                         and does not necessarily represent a full day.
     * @param {number} [offset=0] - The offset from the beginning of the forecast data.
     * @returns {Promise<Object>} A promise that resolves with the evaluated weather conditions.
     */
    fetchLongTermForecast(count, offset = 0) {
      const url = `https://weatherapi.pelmorex.com/api/v1/longterm?locale=${this.locale}&lat=${this.lat}&long=${this.long}&unit=${this.unit}&count=${count}&offset=${offset}`;
      const self = this;
      return $.ajax({
        url: url,
        dataType: 'json'
      }).then(function(response) {
        const conditions = self.evaluateLongTermForecast(response);
        return conditions;
      }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error("Error fetching long-term weather data:", textStatus, errorThrown);
        return $.Deferred().reject(jqXHR, textStatus, errorThrown).promise();
      });
    }
  
    /**
     * Evaluates the short-term weather forecast for significant conditions.
     * Sums up all snow values across forecast periods and sets significantSnow to true if the total exceeds the snowThreshold.
     * Also checks for hail presence and weather alerts.
     *
     * @param {Object} data - The JSON response from the short-term weather API.
     * @returns {Object} An object with flags for significant snow, hail, and alerts.
     */
    // In WeatherChecker.js, update the short-term forecast evaluator:
    evaluateShortTermForecast(data) {
        const conditions = {
        significantSnow: false,
        hailDetected: false,
        weatherAlert: false,
        totalSnow: 0
        };
    
        let totalSnow = 0;
        if (data.shortTerm && Array.isArray(data.shortTerm)) {
        $.each(data.shortTerm, (index, forecast) => {
            if (forecast.snow && typeof forecast.snow.value === 'number') {
            totalSnow += forecast.snow.value;
            }
            if (forecast.hail === true) {
            conditions.hailDetected = true;
            }
        });
        }
        conditions.totalSnow = totalSnow;
        
        if (totalSnow > this.snowThreshold) {
            conditions.significantSnow = true;
        }
        if (data.weatherAlert && Array.isArray(data.weatherAlert) && data.weatherAlert.length > 0) {
            conditions.weatherAlert = true;
        }
        return conditions;
    }
  
    /**
     * Evaluates the long-term weather forecast for significant conditions.
     * Assumes forecasts are provided in the "longTerm" array and that snow is an object with a "value" property.
     *
     * @param {Object} data - The JSON response from the long-term weather API.
     * @returns {Object} An object with flags for significant snow, hail, and alerts.
     */
    evaluateLongTermForecast(data) {
      const conditions = {
        significantSnow: false,
        hailDetected: false,
        weatherAlert: false
      };
  
      if (data.longTerm && Array.isArray(data.longTerm)) {
        $.each(data.longTerm, (index, forecast) => {
          if (forecast.snow && typeof forecast.snow.value === 'number' && forecast.snow.value > this.snowThreshold) {
            conditions.significantSnow = true;
          }
          if (forecast.hail === true) {
            conditions.hailDetected = true;
          }
        });
      }
  
      if (data.weatherAlert && Array.isArray(data.weatherAlert) && data.weatherAlert.length > 0) {
        conditions.weatherAlert = true;
      }
  
      return conditions;
    }
  
    /**
     * Displays alert messages based on the evaluated weather conditions.
     *
     * @param {Object} conditions - An object containing flags for various weather conditions.
     */
    displayAlerts(conditions) {
      const alertMessages = [];
  
      if (conditions.significantSnow) {
        alertMessages.push("More than " + this.snowThreshold + "cm of snow forecasted");
      }
      if (conditions.hailDetected) {
        alertMessages.push("Hail detected in forecast");
      }
      if (conditions.weatherAlert) {
        alertMessages.push("Weather alerts present");
      }
  
      if (alertMessages.length > 0) {
        console.log("Alert: " + alertMessages.join(". ") + ".");
      } else {
        console.log("No significant weather conditions detected.");
      }
    }
  }
  
  // Export the class so it can be imported by other modules.
  export default WeatherChecker;
  