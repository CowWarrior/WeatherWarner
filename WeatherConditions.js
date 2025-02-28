export default class WeatherConditions {
  constructor() {
    this.totalSnow = 0;
    this.significantSnow = false;
    this.hailDetected = false;
    this.weatherAlert = false;
    this.periods = [];
    this.display = {};
  }
}