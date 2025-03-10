import WeatherChecker from './WeatherChecker.js';

// Global variables to store data
let cityData = [];
let localeData = {};
let currentLocale = "";

// Helper: Round numeric values to one decimal place.
function formatNumber(value) {
  return (typeof value === 'number') ? value.toFixed(1) : value;
}

// Helper: update all elements with data-i18n attribute.
function updateContent() {
  $('[data-i18n]').each(function(){
    const key = $(this).data('i18n');
    $(this).text(i18next.t(key));
  });
  updateFooter();
}

// Helper: update the footer with the browser's language.
function updateFooter() {
  $("#detectedLanguage").text(navigator.language);
}

// Helper: mapping from locale to flag icon class using Flag Icons v7.2.3 and Flag Icons CA.
function getFlagIcon(locale) {
  return localeData[locale] ? localeData[locale].flag : "";
}

// Helper: mapping from locale to full language name.
function getFullLanguageName(locale) {
  return localeData[locale] ? localeData[locale].language : locale;
}

// Helper: update the active language display (flag and full language name) next to the language dropdown.
function updateActiveLanguageDisplay() {
  const flagClass = getFlagIcon(currentLocale);
  $("#activeLanguageIcon").attr("class", "fi " + flagClass + " me-2");
  $("#activeLanguageText").text(getFullLanguageName(currentLocale));
}

// Helper: build the city dropdown based on the current locale.
function buildCityDropdown(cities) {
  const $citySelect = $('#citySelect');
  $citySelect.empty();
  // Add the "Custom" option.
  $citySelect.append(`<option value="custom" data-i18n="form.custom">${i18next.t("form.custom")}</option>`);
  
  // Sort cities alphabetically by their English name.
  cities.sort((a, b) => a.name_en.localeCompare(b.name_en));
  
  // Build options: use English names for English locales; French names for French.
  $.each(cities, function(index, city) {
    let optionText = currentLocale.startsWith("en") ? city.name_en : city.name_fr;
    const value = city.lat + "," + city.long;
    const selected = (city.name_en.toLowerCase().includes("montreal")) ? "selected" : "";
    $citySelect.append(`<option value="${value}" ${selected}>${optionText}</option>`);
  });
  
  // Update coordinate fields if the selected option is not "custom".
  const selectedVal = $citySelect.find('option:selected').val();
  if (selectedVal !== "custom") {
    const coords = selectedVal.split(",");
    $("#latitude").val(coords[0]);
    $("#longitude").val(coords[1]);
  }
}

// Helper: build the language dropdown.
function buildLanguageDropdown() {
  const $languageSelect = $('#languageDropdownMenu');
  $languageSelect.empty();

  // Populate the language dropdown with available locales.
  Object.keys(localeData).forEach(locale => {
    const { language, flag } = localeData[locale];
    
    const listItem = $('<li>');
    const anchor = $('<a>', {
      class: 'dropdown-item language-option',
      'data-locale': locale,
      href: '#'
    });

    const flagSpan = $('<span>', {
      class: `fi ${flag} me-2`
    });

    anchor.append(flagSpan).append(document.createTextNode(language));
    listItem.append(anchor);
    $languageSelect.append(listItem);
  });

  // Handle language selection from the hamburger menu.
  $(".language-option").click(handleLanguageSelection);
}

// Handle language selection from the hamburger menu.
function handleLanguageSelection(e) {
  e.preventDefault();
  const newLocale = $(this).data("locale");
  i18next.changeLanguage(newLocale, function(err, t) {
    currentLocale = newLocale;
    updateContent();
    buildCityDropdown(cityData);
    updateActiveLanguageDisplay();
  });
}

// Handle city selection change.
function handleCitySelectionChange() {
  const value = $(this).val();
  if (value === "custom") {
    $("#latitude").val("");
    $("#longitude").val("");
  } else {
    const coords = value.split(",");
    $("#latitude").val(coords[0]);
    $("#longitude").val(coords[1]);
  }
}

// Handle "Use Current Location" button click.
function handleUseCurrentLocationClick() {
  if (navigator.geolocation) {
    $(this).prop("disabled", true).text(i18next.t("form.fetchLocation"));
    
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const long = position.coords.longitude;
      $("#latitude").val(lat);
      $("#longitude").val(long);
      $("#citySelect").val("custom");
      $("#useCurrentLocationBtn").prop("disabled", false).text(i18next.t("form.useCurrentLocation"));
    }, function(error) {
      let errorMessage;
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = i18next.t("error.permissionDenied");
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = i18next.t("error.positionUnavailable");
          break;
        case error.TIMEOUT:
          errorMessage = i18next.t("error.timeout");
          break;
        case error.UNKNOWN_ERROR:
        default:
          errorMessage = i18next.t("error.unknown");
          break;
      }
      alert(i18next.t("error.location") + ": " + errorMessage);
      $("#useCurrentLocationBtn").prop("disabled", false).text(i18next.t("form.useCurrentLocation"));
    });
  } else {
    alert(i18next.t("error.geolocationNotSupported"));
  }
}

// Handle form submission.
function handleFormSubmission(e) {
  e.preventDefault();
  const lat = parseFloat($("#latitude").val());
  const long = parseFloat($("#longitude").val());
  const weatherChecker = new WeatherChecker(lat, long);
  weatherChecker.snowThreshold = 2;
  
  $("#short-term-forecast").html(i18next.t("forecast.loading") || "Loading short-term forecast...");
  $("#long-term-forecast").html(i18next.t("forecast.loading") || "Loading long-term forecast...");
  $("#shortTermCard").removeClass("bg-warning bg-danger text-white");
  $("#longTermCard").removeClass("bg-warning bg-danger text-white");
  
  // Fetch and evaluate short-term forecast.
  weatherChecker.fetchShortTermForecast(6)
    .then(function(rawData) {
      const conditions = weatherChecker.evaluateShortTermForecast(rawData);
      // Use display unit from API if provided; otherwise default to "cm" for snow.
      const snowUnit = (conditions.display && conditions.display.unit && conditions.display.unit.snow) ? conditions.display.unit.snow : "cm";
      let message = "";
      message += i18next.t("alerts.totalSnow", { total: formatNumber(conditions.totalSnow), unit: snowUnit }) + "<br>";
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
      if (conditions.weatherAlert || conditions.totalSnow > 10) {
        $("#shortTermCard").addClass("bg-danger text-white");
      } else if (conditions.totalSnow > weatherChecker.snowThreshold) {
        $("#shortTermCard").addClass("bg-warning");
      }
    })
    .catch(function() {
      $("#short-term-forecast").html("Error fetching short-term forecast.");
    });
  
  // Fetch and evaluate long-term forecast.
  weatherChecker.fetchLongTermForecast(15, 0)
    .then(function(rawData) {
      const conditions = weatherChecker.evaluateLongTermForecast(rawData);
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
      if (conditions.weatherAlert || conditions.totalSnow > 10) {
        $("#longTermCard").addClass("bg-danger text-white");
      } else if (conditions.totalSnow > weatherChecker.snowThreshold) {
        $("#longTermCard").addClass("bg-warning");
      }
      // Build an accordion with detailed long-term forecast information.
      buildLongTermAccordion(conditions);
    })
    .catch(function() {
      $("#long-term-forecast").html("Error fetching long-term forecast.");
    });
}

// Helper: summarize long-term forecast period information.
function summarizeLongTermPeriod(period, units) {
  let summary = "";
  let hasPrecipitation = false;

  if (period.feelsLike) {
    summary += `, ${formatNumber(period.feelsLike)}°${units.temperature}`;
  } else if (period.day.feelsLike) {
    summary += `, ${formatNumber(period.day.feelsLike)}°${units.temperature}`;
  }

  if (period.snow.value && period.snow.value > 0) {
    summary += ` - ${i18next.t("accordion.snow")}: ${formatNumber(period.snow.value)}${units.snow}`;
    hasPrecipitation = true;
  }

  if (period.rain.value && period.rain.value > 0) {
    summary += ` - ${i18next.t("accordion.rain")}: ${formatNumber(period.rain.value)}${units.rain}`;
    hasPrecipitation = true;
  }

  if (hasPrecipitation) {
    if (period.pop) {
      summary += ` - ${formatNumber(period.pop)}${units.pop}`;
    } else if (period.day && period.day.pop) {
      summary += ` - ${formatNumber(period.day.pop)}${units.pop}`;
    }
  }

  return summary;
}

function buildSubperiodCard(title, subperiod, displayUnits) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.width = '18rem';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';
  
  //cardBody.style.backgroundImage = 'linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url(https://icons.twnmm.com/wx_icons/v2/${subperiod.weatherCode.bgImage}")'; 
  
  //cardBody.style.backgroundImage = `url("https://icons.twnmm.com/wx_icons/v2/${subperiod.weatherCode.bgImage}.svg")`; 
  
  //cardBody.style.backgroundColor = 'linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5))';
  //cardBody.style.backgroundSize = 'cover';
  //cardBody.style.backgroundPosition = 'top-right';
  //cardBody.style.backgroundRepeat = 'no-repeat';

  const cardTitle = document.createElement('h5');
  cardTitle.className = 'card-title';
  cardTitle.textContent = title;

  const cardText = document.createElement('p');
  cardText.className = 'card-text';

  //TODO: Refactor this to use objects instead of strings
  console.log(subperiod);
  cardText.innerHTML = `<img src="https://icons.twnmm.com/wx_icons/v2/${subperiod.weatherCode.icon}.svg" alt="${subperiod.weatherCode.text}" style="width:40px;height:40px;">
                      </br>${i18next.t("accordion.temperature")}: ${formatNumber(subperiod.temperature.value)}°${displayUnits.temperature}
                      </br>${i18next.t("accordion.feelsLike")}: ${formatNumber(subperiod.feelsLike)}°${displayUnits.temperature}
                      </br>${i18next.t("accordion.snow")}: ${formatNumber(subperiod.snow.value)} ${displayUnits.snow || "cm"}
                      </br>${i18next.t("accordion.rain")}: ${formatNumber(subperiod.rain.value)} ${displayUnits.rain || "mm"}
                      </br>${i18next.t("accordion.wind")}: ${formatNumber(subperiod.wind.direction)} ${formatNumber(subperiod.wind.speed)} ${displayUnits.wind || "km/h"}
                      </br>${i18next.t("accordion.humidity")}: ${formatNumber(subperiod.relativeHumidity)} ${displayUnits.humidity || "%"}
                      `;

  cardBody.appendChild(cardTitle);
  cardBody.appendChild(cardText);
  card.appendChild(cardBody);

  return card;
}

// Helper: build an accordion with details for each long-term forecast period.
function buildLongTermAccordion(conditions) {
  const periods = conditions.periods || [];
  const displayUnits = (conditions.display && conditions.display.unit) ? conditions.display.unit : { rain: "mm", snow: "cm" };
  const accordionContainer = document.createElement('div');
  accordionContainer.className = 'accordion';
  accordionContainer.id = 'forecastAccordion';

  if (periods.length > 0) {
    periods.forEach((period, index) => {
      const collapseId = "collapsePeriod" + index;
      const headingId = "headingPeriod" + index;
      const accordionItem = document.createElement('div');
      accordionItem.className = 'accordion-item';

      const accordionHeader = document.createElement('h2');
      accordionHeader.className = 'accordion-header';
      accordionHeader.id = headingId;

      const accordionButton = document.createElement('button');
      accordionButton.className = `accordion-button "collapsed"`;
      accordionButton.type = 'button';
      accordionButton.dataset.bsToggle = 'collapse';
      accordionButton.dataset.bsTarget = `#${collapseId}`;
      accordionButton.ariaExpanded = index === 0 ? "true" : "false";
      accordionButton.ariaControls = collapseId;

      let periodDate = new Date(period.time.local);
      let periodName;
      if (periodDate >= new Date(periodDate.getFullYear(), 11, 24) || periodDate <= new Date(periodDate.getFullYear(), 0, 7)) {
        //show year if the date is around New Year
        periodName = periodDate.toLocaleDateString(currentLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        periodName = periodDate.toLocaleDateString(currentLocale, { weekday: 'long', month: 'long', day: 'numeric' });
      }
      periodName = periodName.charAt(0).toUpperCase() + periodName.slice(1);
      accordionButton.textContent = periodName + summarizeLongTermPeriod(period, displayUnits);

      accordionHeader.appendChild(accordionButton);
      accordionItem.appendChild(accordionHeader);

      const accordionCollapse = document.createElement('div');
      accordionCollapse.id = collapseId;
      accordionCollapse.className = `accordion-collapse collapse`;
      accordionCollapse.ariaLabelledby = headingId;
      accordionCollapse.dataset.bsParent = '#forecastAccordion';

      const accordionBody = document.createElement('div');
      accordionBody.className = 'accordion-body';

      const row = document.createElement('div');
      row.className = 'row';

      const dayColumn = document.createElement('div');
      dayColumn.className = 'col-md-6';

      const dayCard = buildSubperiodCard(i18next.t("accordion.day"), period.day, displayUnits);
      dayColumn.appendChild(dayCard);

      const nightColumn = document.createElement('div');
      nightColumn.className = 'col-md-6';

      const nightCard = buildSubperiodCard(i18next.t("accordion.night"), period.night, displayUnits);
      nightColumn.appendChild(nightCard);

      row.appendChild(dayColumn);
      row.appendChild(nightColumn);
      accordionBody.appendChild(row);
      accordionCollapse.appendChild(accordionBody);
      accordionItem.appendChild(accordionCollapse);
      accordionContainer.appendChild(accordionItem);
    });

    if (conditions.specialWeatherStatement) {
      const specialItem = document.createElement('div');
      specialItem.className = 'accordion-item';

      const specialBody = document.createElement('div');
      specialBody.className = 'accordion-body';
      specialBody.innerHTML = `<p>${conditions.specialWeatherStatement}</p>`;

      specialItem.appendChild(specialBody);
      accordionContainer.appendChild(specialItem);
    }
  } else {
    const noDetailsItem = document.createElement('div');
    noDetailsItem.className = 'accordion-item';

    const noDetailsBody = document.createElement('div');
    noDetailsBody.className = 'accordion-body';
    noDetailsBody.textContent = i18next.t("accordion.noDetails");

    noDetailsItem.appendChild(noDetailsBody);
    accordionContainer.appendChild(noDetailsItem);
  }

  document.getElementById('longTermAccordionContainer').innerHTML = '';
  document.getElementById('longTermAccordionContainer').appendChild(accordionContainer);
}

// Function to initialize the application
function initializeApp() {
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
      currentLocale = i18next.language || 'en-CA';
      updateContent();
      updateFooter();
      updateActiveLanguageDisplay();
    });

  // Load locale data from locale.json.
  $.getJSON('locale.json', function(data) {
    localeData = data.locales;
    buildLanguageDropdown();
  }); 
  
  // Load cities data from cities.json.
  $.getJSON('cities.json', function(cities) {
    cityData = cities;
    buildCityDropdown(cityData);
  });
  
  // Update coordinate fields when the city dropdown selection changes.
  $("#citySelect").change(handleCitySelectionChange);
  
  // Handle "Use Current Location" button click.
  $("#useCurrentLocationBtn").click(handleUseCurrentLocationClick);
  
  // Handle form submission.
  $("#weatherForm").submit(handleFormSubmission);
}

// Initialize the application when the document is ready
$(document).ready(initializeApp);

