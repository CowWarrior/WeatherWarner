import WeatherChecker from './WeatherChecker.js';

// Initialize i18next with XHR backend and language detector.
i18next
  .use(i18nextXHRBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    fallbackLng: 'en-CA',
    debug: false,
    backend: {
      loadPath: 'locales/{{lng}}.json'
    }
  }, function(err, t) {
    updateContent();
    updateFooter();
  });

// Helper: Returns the flag icon class for a given locale.
function getFlagIcon(locale) {
    // Map locale to flag icon class
    switch (locale) {
      case "en-CA":
      case "fr-CA":
        return "flag-icon-ca";
      case "en-US":
        return "flag-icon-us";
      case "fr-FR":
        return "flag-icon-fr";
      case "es-MX":
        return "flag-icon-mx";
      case "es-ES":
        return "flag-icon-es";
      default:
        return "";
    }
}

// Helper: update all elements with [data-i18n] attribute.
function updateContent() {
  $('[data-i18n]').each(function(){
    const key = $(this).data('i18n');
    $(this).text(i18next.t(key));
  });
  updateFooter();
  updateActiveLanguageDisplay();
}

// Helper: update the active language display in the navbar.
function updateActiveLanguageDisplay() {
    const flagClass = getFlagIcon(currentLocale);
    // Set the flag icon and display the locale code.
    $("#activeLanguageIcon").attr("class", "flag-icon " + flagClass + " me-2");
    // Optionally, update text if desired.
    $("#activeLanguageDisplay").find("span[data-i18n]").first().text(i18next.t("navbar.title"));
  }

// Helper: update the footer with the current detected language.
function updateFooter() {
    // Use the browser's language value from navigator.language
    $("#detectedLanguage").text(navigator.language);
}  

// Global variable to hold the current locale.
let currentLocale = i18next.language || 'en-CA';

// Function to rebuild the city dropdown based on the current locale.
function buildCityDropdown(cities) {
  const $citySelect = $('#citySelect');
  $citySelect.empty(); // Clear existing options.
  // Add the "Custom" option first.
  $citySelect.append(`<option value="custom" data-i18n="form.custom">${i18next.t("form.custom")}</option>`);
  
  // Sort cities alphabetically by their English name.
  cities.sort((a, b) => a.name_en.localeCompare(b.name_en));
  
  // For each city, choose displayed name based on current locale.
  $.each(cities, function(index, city) {
    let optionText = currentLocale.startsWith("en") ? city.name_en : city.name_fr;
    const value = city.lat + "," + city.long;
    // Mark Montreal as default if present.
    const selected = (city.name_en.toLowerCase().includes("montreal")) ? "selected" : "";
    $citySelect.append(`<option value="${value}" ${selected}>${optionText}</option>`);
  });
  
  // Update coordinate fields if the selected option is not "custom".
  const selectedVal = $citySelect.find('option:selected').val();
  if(selectedVal !== "custom") {
    const coords = selectedVal.split(",");
    $("#latitude").val(coords[0]);
    $("#longitude").val(coords[1]);
  }
}

// Global variable to store city data.
let cityData = [];

$(document).ready(function() {
  // Load cities data from cities.json.
  $.getJSON('cities.json', function(cities) {
    cityData = cities;
    buildCityDropdown(cityData);
  });
  
  // Update coordinate fields when the drop-down selection changes.
  $("#citySelect").change(function() {
    const value = $(this).val();
    if(value === "custom"){
      $("#latitude").val("");
      $("#longitude").val("");
    } else {
      const coords = value.split(",");
      $("#latitude").val(coords[0]);
      $("#longitude").val(coords[1]);
    }
  });
  
  // Handle language selection from the hamburger menu.
  $(".language-option").click(function(e) {
    e.preventDefault();
    const newLocale = $(this).data("locale");
    i18next.changeLanguage(newLocale, function(err, t) {
      currentLocale = newLocale;
      updateContent(); // update UI strings
      buildCityDropdown(cityData); // rebuild drop-down with appropriate names
      $("#languageMenu").text(i18next.t("navbar.language") + " (" + newLocale + ")");
    });
  });
  
  // Handle form submission.
  $("#weatherForm").submit(function(e) {
    e.preventDefault();
    const lat = parseFloat($("#latitude").val());
    const long = parseFloat($("#longitude").val());
    const weatherChecker = new WeatherChecker(lat, long);
    weatherChecker.snowThreshold = 2; // Modify threshold if needed.
    
    // Clear previous results and styling.
    $("#short-term-forecast").html(i18next.t("forecast.loading") || "Loading short-term forecast...");
    $("#long-term-forecast").html(i18next.t("forecast.loading") || "Loading long-term forecast...");
    $("#shortTermCard").removeClass("bg-warning bg-danger text-white");
    $("#longTermCard").removeClass("bg-warning bg-danger text-white");
    
    // Fetch and display the short-term forecast.
    weatherChecker.fetchShortTermForecast(6)
      .then(function(conditions) {
        let message = "";
        if (conditions.significantSnow) {
          message += i18next.t("alerts.snowWarning", { threshold: weatherChecker.snowThreshold }) + "<br>";
        }
        if (conditions.hailDetected) {
          message += i18next.t("alerts.hail") + "<br>";
        }
        if (conditions.weatherAlert) {
          message += i18next.t("alerts.weatherAlert") + "<br>";
        }
        if (!message) {
          message = i18next.t("alerts.noAlerts") + "<br>";
        }
        $("#short-term-forecast").html(message);
        // Update card style.
        if (conditions.weatherAlert || conditions.totalSnow > 10) {
          $("#shortTermCard").addClass("bg-danger text-white");
        } else if (conditions.totalSnow > weatherChecker.snowThreshold) {
          $("#shortTermCard").addClass("bg-warning");
        }
      })
      .catch(function() {
        $("#short-term-forecast").html("Error fetching short-term forecast.");
      });
    
    // Fetch and display the long-term forecast.
    weatherChecker.fetchLongTermForecast(15, 0)
      .then(function(conditions) {
        let message = "";
        if (conditions.significantSnow) {
          message += i18next.t("alerts.snowWarning", { threshold: weatherChecker.snowThreshold }) + "<br>";
        }
        if (conditions.hailDetected) {
          message += i18next.t("alerts.hail") + "<br>";
        }
        if (conditions.weatherAlert) {
          message += i18next.t("alerts.weatherAlert") + "<br>";
        }
        if (!message) {
          message = i18next.t("alerts.noAlerts") + "<br>";
        }
        $("#long-term-forecast").html(message);
        // Update card style.
        if (conditions.weatherAlert || conditions.totalSnow > 10) {
          $("#longTermCard").addClass("bg-danger text-white");
        } else if (conditions.totalSnow > weatherChecker.snowThreshold) {
          $("#longTermCard").addClass("bg-warning");
        }
      })
      .catch(function() {
        $("#long-term-forecast").html("Error fetching long-term forecast.");
      });
  });
});
