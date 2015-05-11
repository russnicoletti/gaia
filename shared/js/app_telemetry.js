/* exported AppTelemetry */
/*
 * This module is a helper for recording telemetry data in Gecko’s telemetry
 * system. Only data from certified apps will be recorded.
 *
 * Constructor
 * 
 *   app      - the application (App object) to which the telemetry data
                corresponds (required)
 *   context  - the context within the application to which the data
                corresponds (optional)
 *   category - the telemetry category to which the data belongs (optional)
 *
 * There are two ways to use the AppTelemetry object.
 * 
 * Use the constructor to set the app, context, and telemetry category.
 * Instantiating an AppTelemetry object this way allows the consumer of the
 * object to add telemetry data by invoking the 'add' function, passing only
 * the telemetry data to be added.
 *
 * Alternatively, the object can be instantiated by passing only the app
 * object to the constructor. In this scenario, all the telemetry data is
 * passed to the 'add' function in this format:
 * 
 * "<context>|<histogramCategory>|<data>'"
 * 
 * where:
 *
 * <context>  is a string indicating the context within the app to which the
 *            telemetry data corresponds
 * <category> is the telemetry category of the specified telemetry data.
 *            Supported categories are contained in the 'categories' data
 *            member. Currently, the supported categories are:
 *            - 'APP_STARTUP_TIME'
 *            - 'APP_MEMORY'
 * <data>     is the telemetry data being added.
 * 
 * When used in this form, <context> is optional; the other values are required.
 */  
'use strict';

var APP_TELEMETRY_LOG_PREFIX = 'telemetry';
var AppTelemetryCategories = [
  'warm-start-time',
  'cold-start-time'
];

var AppTelemetry = (function() {

  function AppTelemetry(app, context, category) {

    var histogramCategory;

    switch (arguments.length) {
      case 3: 
        this.app = this.getApp(app);
        histogramCategory = this.getCategory(category);
        break;
      case 2:
        this.app = this.getApp(app);
        histogramCategory = this.getCategory(context);
        context = null;
        break;
      case 1:
        this.app = this.getApp(app);
        context = null;
        histogramCategory = null;
        break;
      default:
        this.app = null;
        context = null;
        histogramCategory = null;
        break;
    }
  
    if (this.app && histogramCategory) {
      this.message = APP_TELEMETRY_LOG_PREFIX + '|' + this.app;
    
      if (context) {
        this.message += '|' + context;
      }
  
      this.message += '|' + histogramCategory;
    }
    else {
      this.message = null;
    }
  }
  
  AppTelemetry.prototype.getApp = function(app) {
    try {
      var url = new URL(app.manifestURL);
      if (url.hostname.indexOf('gaiamobile.org') >= 0) {
        return app.manifest.name;
      }
      else {
       console.warn('App telemetry supports certified apps only.');
      }
    } catch (e) {
      return false;
    }
  };
  
  AppTelemetry.prototype.getCategory = function(category) {
    if (AppTelemetryCategories.indexOf(category) !== -1) {
      return category;
    }
  
    console.warn('Invalid telemetry category: ' + category);
    return null;
  };
  
  AppTelemetry.prototype.add = function(telemetry) {
 
    var message;
 
    // If the app/context/category were passed to the constructor,
    // simply add the 'data'
    if (this.message) {
      message = this.message;
      message += '|' + telemetry;
      console.info(message);
    }
    else {

      // If the app/context/category were not passed to the constructor,
      // parse the input for the context, category and data;
      var context;
      var category;
      var data;
  
      // First, ensure we were instantiated with a certified app
      if (!this.app) {
        return;
      }

      // Validate the components of the telemetry data
      var params = telemetry.split('|');
      if (params.length >= 2 && params.length <=3) {
        message = APP_TELEMETRY_LOG_PREFIX + '|' + this.app;
 
        // If there are three components in the telemetry input, the first 
        // is the 'context', the second is the category, the third is the data
        if (params.length === 3) {
          context = params[0];
          category = params[1];
          data = params[2];
        }
        else {
          // If there are two components in the telemetry input, the first 
          // is the category, the second is the data
          category = params[0];
          data = params[1];
        }
  
        if (context) {
          message += '|' + context;
        }
        category = this.getCategory(category);
        if (category) {
          message += '|' + category;
        }
        else {
          console.warn('Telemetry category (' + category + ') not supported');
          return false;
        }
        message += '|' + data;
        console.info(message);
      }
      else {
        console.warn('A telemetry log entry requires three or four parameters');
      }
    } 
  };

  return AppTelemetry;
}());

