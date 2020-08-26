/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
/* global FastClick */

/**
 * Provides information about the device and its supported features.<p>
 * The informations are detected lazily.
 *
 * @singleton
 */
scout.Device = function(model) {
  // user agent string from browser
  this.userAgent = model.userAgent;
  this.features = {};
  this.system = scout.Device.System.UNKNOWN;
  this.type = scout.Device.Type.DESKTOP;
  this.browser = scout.Device.Browser.UNKNOWN;
  this.browserVersion = 0;
  this.scrollbarWidth;

  // --- device specific configuration
  // initialize with empty string so that it can be used without calling initUnselectableAttribute()
  // this property is used with regular JQuery attr(key, value) Syntax and in cases where we create
  // DOM elements by creating a string.
  this.unselectableAttribute = scout.Device.DEFAULT_UNSELECTABLE_ATTRIBUTE;
  this.tableAdditionalDivRequired = false;

  if (this.userAgent) {
    this._parseSystem();
    this._parseSystemVersion();
    this._parseBrowser();
    this._parseBrowserVersion();
  }
};

scout.Device.DEFAULT_UNSELECTABLE_ATTRIBUTE = {
  key: null,
  value: null,
  string: ''
};

scout.Device.vendorPrefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'];

scout.Device.Browser = {
  UNKNOWN: 'Unknown',
  FIREFOX: 'Firefox',
  CHROME: 'Chrome',
  INTERNET_EXPLORER: 'InternetExplorer',
  EDGE: 'Edge',
  SAFARI: 'Safari'
};

scout.Device.System = {
  UNKNOWN: 'Unknown',
  IOS: 'IOS',
  ANDROID: 'ANDROID',
  WINDOWS: 'WINDOWS'
};

scout.Device.Type = {
  DESKTOP: 'DESKTOP',
  TABLET: 'TABLET',
  MOBILE: 'MOBILE'
};

/**
 * Called during bootstrap by index.html before the session startup.<p>
 * Precalculates the value of some attributes to store them
 * in a static way (and prevent many repeating function calls within loops).<p>
 * Also loads device specific scripts (e.g. fast click for ios devices)
 */
scout.Device.prototype.bootstrap = function() {
  var promises = [];

  // Precalculate value and store in a simple property, to prevent many function calls inside loops (e.g. when generating table rows)
  this.unselectableAttribute = this.getUnselectableAttribute();
  this.tableAdditionalDivRequired = this.isTableAdditionalDivRequired();
  this.scrollbarWidth = this._detectScrollbarWidth();
  this.type = this._detectType(this.userAgent);

  if (this._needsFastClick()) {
    // We use Fastclick to prevent the 300ms delay when touching an element.
    promises.push(this._loadFastClickDeferred());
  } else if (this.isIos()) {
    this._installActiveHandler();
  }

  return promises;
};

/**
 * The 300ms delay exists because the browser does not know whether the user wants to just tab or wants to zoom using double tab.
 * Therefore most browsers add the delay only if zoom is enabled. This works for firefox, chrome (>=32) and safari/ios (>=9.3).
 * It does not work if safari is opened in standalone/homescreen mode or in cordova. For IE (and safari since ios 9.3) it can be disabled using a css property called touch-action.
 * By default, zooming is disabled and home screen mode is enabled, see meta tags viewport and apple-mobile-web-app-capable in head.html
 * <p>
 * @return true if it is an older iOS (< 9.3), running in homescreen mode or running in a cordova container. Otherwise false.
 */
scout.Device.prototype._needsFastClick = function() {
  if (!this.isIos()) {
    // Currently only IOS still has the issue -> don't load the script for other systems and browsers
    return false;
  }

  if (this.systemVersion >= 9.3 && !this.isStandalone() && this.browser !== scout.Device.Browser.UNKNOWN) {
    // With iOS >= 9.3 the delay is gone if zooming is disabled, but not for the home screen / web app mode.
    // It is also necessary if running in a cordova container (browser is set to unknown in that case)
    return false;
  }

  // -> load only for older IOS devices or if running in home screen mode or cordova
  return true;
};

scout.Device.prototype._loadFastClickDeferred = function() {
  return this._loadScriptDeferred('res/fastclick-1.0.6.js', function() {
    FastClick.attach(document.body);
    $.log.isInfoEnabled() && $.log.info('FastClick script loaded and attached');
  });
};

scout.Device.prototype._loadScriptDeferred = function(scriptUrl, doneFunc) {
  return $
    .injectScript(scriptUrl)
    .done(doneFunc);
};

/**
 * IOs does only trigger :active when touching an element if a touchstart listener is attached
 * Unfortunately, the :active is also triggered when scrolling, there is no delay.
 * To fix this we would have to work with a custom active class which will be toggled on touchstart/end
 */
scout.Device.prototype._installActiveHandler = function() {
  document.addEventListener('touchstart', function() {}, false);
};

scout.Device.prototype.hasOnScreenKeyboard = function() {
  return this.supportsFeature('_onScreenKeyboard', function() {
    return this.isIos() || this.isAndroid() || this.isWindowsTabletMode();
  }.bind(this));
};

/**
 * Returns if the current browser includes the padding-right-space in the scrollWidth calculations.<br>
 * Such a browser increases the scrollWidth only if the text-content exceeds the space <i>including</i> the right-padding.
 * This means the scrollWidth is equal to the clientWidth until the right-padding-space is consumed as well.
 */
scout.Device.prototype.isScrollWidthIncludingPadding = function() {
  return this.isInternetExplorer() || this.isFirefox() || this.isEdge();
};

/**
 * Safari shows a tooltip if ellipsis are displayed due to text truncation. This is fine but, unfortunately, it cannot be prevented.
 * Because showing two tooltips at the same time (native and custom) is bad, the custom tooltip cannot be displayed.
 * @returns {Boolean}
 */
scout.Device.prototype.isCustomEllipsisTooltipPossible = function() {
  return this.browser !== scout.Device.Browser.SAFARI;
};

/**
 * @returns {string} 'iphone' if the current device is an iPhone
 */
scout.Device.prototype.cssClassForIphone = function() {
  return this.isIphone() ? 'iphone' : '';
};

/**
 * @returns {boolean} true if the current device is an iPhone. This is more specific than the <code>isIos</code> function
 * which also includes iPads and iPods.
 */
scout.Device.prototype.isIphone = function() {
  return this.userAgent.indexOf('iPhone') > -1;
};

scout.Device.prototype.isIos = function() {
  return scout.Device.System.IOS === this.system;
};

scout.Device.prototype.isEdge = function() {
  return scout.Device.Browser.EDGE === this.browser;
};

scout.Device.prototype.isInternetExplorer = function() {
  return scout.Device.Browser.INTERNET_EXPLORER === this.browser;
};

scout.Device.prototype.isFirefox = function() {
  return scout.Device.Browser.FIREFOX === this.browser;
};

scout.Device.prototype.isChrome = function() {
  return scout.Device.Browser.CHROME === this.browser;
};

/**
 * Compared to isIos() this function uses navigator.platform instead of navigator.userAgent to check whether the app runs on iOS.
 * Most of the time isIos() is the way to go.
 * This function was mainly introduced to detect whether it is a real iOS or an emulated one (e.g. using chrome emulator).
 * @returns true if the platform is iOS, false if not (e.g. if chrome emulator is running)
 */
scout.Device.prototype.isIosPlatform = function() {
  return /iPad|iPhone|iPod/.test(navigator.platform);
};

scout.Device.prototype.isAndroid = function() {
  return scout.Device.System.ANDROID === this.system;
};

/**
 * The best way we have to detect a Microsoft Surface Tablet in table mode is to check if
 * the scrollbar width is 0 pixel. In desktop mode the scrollbar width is > 0 pixel.
 */
scout.Device.prototype.isWindowsTabletMode = function() {
  return scout.Device.System.WINDOWS === this.system && this.systemVersion >= 10 && this.scrollbarWidth === 0;
};

/**
 * @returns true if navigator.standalone is true which is the case for iOS home screen mode
 */
scout.Device.prototype.isStandalone = function() {
  return !!window.navigator.standalone;
};

// TODO [awe] Scout 10.0 - remove functions required for IE 9 support, also check FocusManager#_handleIEEvent

/**
 * This method returns false for very old browsers. Basically we check for the first version
 * that supports ECMAScript 5. This methods excludes all browsers that are known to be
 * unsupported, all others (e.g. unknown engines) are allowed by default.
 */
scout.Device.prototype.isSupportedBrowser = function(browser, version) {
  browser = scout.nvl(browser, this.browser);
  version = scout.nvl(version, this.browserVersion);
  var browsers = scout.Device.Browser;
  if ((browser === browsers.INTERNET_EXPLORER && version < 11) ||
    (browser === browsers.CHROME && version < 40) ||
    (browser === browsers.FIREFOX && version < 35) ||
    (browser === browsers.SAFARI && version < 8)) {
    return false;
  }
  return true;
};

/**
 * Can not detect type until DOM is ready because we must create a DIV to measure the scrollbars.
 */
scout.Device.prototype._detectType = function(userAgent) {
  if (scout.Device.System.ANDROID === this.system) {
    if (userAgent.indexOf('Mobile') > -1) {
      return scout.Device.Type.MOBILE;
    } else {
      return scout.Device.Type.TABLET;
    }
  } else if (scout.Device.System.IOS === this.system) {
    if (userAgent.indexOf('iPad') > -1) {
      return scout.Device.Type.TABLET;
    } else {
      return scout.Device.Type.MOBILE;
    }
  } else if (this.isWindowsTabletMode()) {
    return scout.Device.Type.TABLET;
  }
  return scout.Device.Type.DESKTOP;
};

scout.Device.prototype._parseSystem = function() {
  var userAgent = this.userAgent;
  if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    this.system = scout.Device.System.IOS;
  } else if (userAgent.indexOf('Android') > -1) {
    this.system = scout.Device.System.ANDROID;
  } else if (userAgent.indexOf('Windows') > -1) {
    this.system = scout.Device.System.WINDOWS;
  }
};

/**
 * Currently only supports IOS
 */
scout.Device.prototype._parseSystemVersion = function() {
  var versionRegex,
    System = scout.Device.System,
    userAgent = this.userAgent;

  if (this.system === System.IOS) {
    versionRegex = / OS ([0-9]+\.?[0-9]*)/;
    // replace all _ with .
    userAgent = userAgent.replace(/_/g, '.');
  } else if (this.system === System.WINDOWS) {
    versionRegex = /Windows NT ([0-9]+\.?[0-9]*)/;
  }

  if (versionRegex) {
    this.systemVersion = this._parseVersion(userAgent, versionRegex);
  }
};

scout.Device.prototype._parseBrowser = function() {
  var userAgent = this.userAgent;

  if (userAgent.indexOf('Firefox') > -1) {
    this.browser = scout.Device.Browser.FIREFOX;
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
    this.browser = scout.Device.Browser.INTERNET_EXPLORER;
  } else if (userAgent.indexOf('Edge') > -1) {
    // must check for Edge before we do other checks, because the Edge user-agent string
    // also contains matches for Chrome and Webkit.
    this.browser = scout.Device.Browser.EDGE;
  } else if (userAgent.indexOf('Chrome') > -1) {
    this.browser = scout.Device.Browser.CHROME;
  } else if (userAgent.indexOf('Safari') > -1) {
    this.browser = scout.Device.Browser.SAFARI;
  }
};

/**
 * Version regex only matches the first number pair
 * but not the revision-version. Example:
 * - 21     match: 21
 * - 21.1   match: 21.1
 * - 21.1.3 match: 21.1
 */
scout.Device.prototype._parseBrowserVersion = function() {
  var versionRegex,
    browsers = scout.Device.Browser,
    userAgent = this.userAgent;

  if (this.browser === browsers.INTERNET_EXPLORER) {
    // with internet explorer 11 user agent string does not contain the 'MSIE' string anymore
    // additionally in new version the version-number after Trident/ is not the browser-version
    // but the engine-version.
    if (userAgent.indexOf('MSIE') > -1) {
      versionRegex = /MSIE ([0-9]+\.?[0-9]*)/;
    } else {
      versionRegex = /rv:([0-9]+\.?[0-9]*)/;
    }
  } else if (this.browser === browsers.EDGE) {
    versionRegex = /Edge\/([0-9]+\.?[0-9]*)/;
  } else if (this.browser === browsers.SAFARI) {
    versionRegex = /Version\/([0-9]+\.?[0-9]*)/;
  } else if (this.browser === browsers.FIREFOX) {
    versionRegex = /Firefox\/([0-9]+\.?[0-9]*)/;
  } else if (this.browser === browsers.CHROME) {
    versionRegex = /Chrome\/([0-9]+\.?[0-9]*)/;
  }
  if (versionRegex) {
    this.browserVersion = this._parseVersion(userAgent, versionRegex);
  }
};

scout.Device.prototype._parseVersion = function(userAgent, versionRegex) {
  var matches = versionRegex.exec(userAgent);
  if (Array.isArray(matches) && matches.length === 2) {
    return parseFloat(matches[1]);
  }
};

scout.Device.prototype.supportsFeature = function(property, checkFunc) {
  if (this.features[property] === undefined) {
    this.features[property] = checkFunc(property);
  }
  return this.features[property];
};

/**
 * Currently this method should be used when you want to check if the device is "touch only" -
 * which means the user has no keyboard or mouse. Some hybrids like Surface tablets in desktop mode are
 * still touch devices, but support keyboard and mouse at the same time. In such cases this method will
 * return false, since the device is not touch only.
 *
 * Currently this method returns the same as hasOnScreenKeyboard(). Maybe the implementation here will be
 * different in the future.
 */
scout.Device.prototype.supportsOnlyTouch = function() {
  return this.supportsFeature('_onlyTouch', this.hasOnScreenKeyboard.bind(this));
};

/**
 * @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
 * @see https://codeburst.io/the-only-way-to-detect-touch-with-javascript-7791a3346685
 */
scout.Device.prototype.supportsTouch = function() {
  return this.supportsFeature('_touch', function check(property) {
    return (('ontouchstart' in window) || window.TouchEvent || window.DocumentTouch && document instanceof window.DocumentTouch);
  });
};

scout.Device.prototype.supportsFile = function() {
  return (window.File ? true : false);
};

/**
 * Some browsers support the file API but don't support the File constructor (new File()).
 */
scout.Device.prototype.supportsFileConstructor = function() {
  return typeof File === 'function';
};

scout.Device.prototype.supportsCssAnimation = function() {
  return this.supportsCssProperty('animation');
};

/**
 * Used to determine if browser supports full history API.
 * Note that IE9 only partially supports the API, pushState and replaceState functions are missing.
 * @see: https://developer.mozilla.org/de/docs/Web/API/Window/history
 */
scout.Device.prototype.supportsHistoryApi = function() {
  return !!(window.history && window.history.pushState);
};

scout.Device.prototype.supportsCssGradient = function() {
  var testValue = 'linear-gradient(to left, #000 0%, #000 50%, transparent 50%, transparent 100% )';
  return this.supportsFeature('gradient', this.checkCssValue.bind(this, 'backgroundImage', testValue, function(actualValue) {
    return (actualValue + '').indexOf('gradient') > 0;
  }));
};

scout.Device.prototype.supportsCssUserSelect = function() {
  return this.supportsCssProperty('userSelect');
};

scout.Device.prototype.supportsInternationalization = function() {
  return window.Intl && typeof window.Intl === 'object';
};

/**
 * Returns true if the device supports the download of resources in the same window as the single page app is running.
 * With "download" we mean: change <code>window.location.href</code> to the URL of the resource to download. Some browsers don't
 * support this behavior and require the resource to be opened in a new window with <code>window.open</code>.
 */
scout.Device.prototype.supportsDownloadInSameWindow = function() {
  return scout.Device.Browser.FIREFOX !== this.browser;
};

scout.Device.prototype.hasPrettyScrollbars = function() {
  return this.supportsFeature('_prettyScrollbars', function check(property) {
    return this.scrollbarWidth === 0;
  }.bind(this));
};

scout.Device.prototype.canHideScrollbars = function() {
  return this.supportsFeature('_canHideScrollbars', function check(property) {
    // Check if scrollbar is vanished if class hybrid-scrollable is applied which hides the scrollbar, see also scrollbars.js and Scrollbar.less
    return this._detectScrollbarWidth('hybrid-scrollable') === 0;
  }.bind(this));
};

scout.Device.prototype.supportsCopyFromDisabledInputFields = function() {
  return scout.Device.Browser.FIREFOX !== this.browser;
};

/**
 * If the mouse down on an element with a pseudo element removes the pseudo element (e.g. check box toggling),
 * the firefox cannot focus the element anymore and instead focuses the body. In that case manual focus handling is necessary.
 */
scout.Device.prototype.loosesFocusIfPseudoElementIsRemoved = function() {
  return scout.Device.Browser.FIREFOX === this.browser;
};

scout.Device.prototype.supportsCssProperty = function(property) {
  return this.supportsFeature(property, function check(property) {
    if (document.body.style[property] !== undefined) {
      return true;
    }

    property = property.charAt(0).toUpperCase() + property.slice(1);
    for (var i = 0; i < scout.Device.vendorPrefixes.length; i++) {
      if (document.body.style[scout.Device.vendorPrefixes[i] + property] !== undefined) {
        return true;
      }
    }
    return false;
  });
};

scout.Device.prototype.supportsGeolocation = function() {
  if (navigator.geolocation) {
    return true;
  }
  return false;
};

/**
 * When we call .preventDefault() on a mousedown event Firefox doesn't apply the :active state.
 * Since W3C does not specify an expected behavior, we need this workaround for consistent behavior in
 * our UI. The issue has been reported to Mozilla but it doesn't look like there will be a bugfix soon:
 *
 * https://bugzilla.mozilla.org/show_bug.cgi?id=771241#c7
 */
scout.Device.prototype.requiresSyntheticActiveState = function() {
  return this.isFirefox();
};

scout.Device.prototype.supportsPassiveEventListener = function() {
  return this.supportsFeature('_passiveEventListener', function check(property) {
    // Code from MDN https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
    var passiveSupported = false;
    try {
      var options = Object.defineProperty({}, 'passive', {
        get: function() {
          passiveSupported = true;
        }
      });
      window.addEventListener('test', options, options);
      window.removeEventListener('test', options, options);
    } catch(err) {
      passiveSupported = false;
    }
    return passiveSupported;
  }.bind(this));
};

scout.Device.prototype.checkCssValue = function(property, value, checkFunc) {
  // Check if property is supported at all, otherwise div.style[property] would just add it and checkFunc would always return true
  if (document.body.style[property] === undefined) {
    return false;
  }
  var div = document.createElement('div');
  div.style[property] = value;
  if (checkFunc(div.style[property])) {
    return true;
  }

  property = property.charAt(0).toUpperCase() + property.slice(1);
  for (var i = 0; i < scout.Device.vendorPrefixes.length; i++) {
    var vendorProperty = scout.Device.vendorPrefixes[i] + property;
    if (document.body.style[vendorProperty] !== undefined) {
      div.style[vendorProperty] = value;
      if (checkFunc(div.style[vendorProperty])) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Returns '' for modern browsers, that support the 'user-select' CSS property.
 * Returns ' unselectable="on"' for IE9.
 * This string can be used to add to any HTML element as attribute.
 */
scout.Device.prototype.getUnselectableAttribute = function() {
  return this.supportsFeature('_unselectableAttribute', function(property) {
    if (this.supportsCssUserSelect()) {
      return scout.Device.DEFAULT_UNSELECTABLE_ATTRIBUTE;
    }
    // required for IE 9
    return {
      key: 'unselectable',
      value: 'on',
      string: ' unselectable="on"'
    };
  }.bind(this));
};

/**
 * Returns false for modern browsers, that support CSS table-cell properties restricted with a
 * max-width and hidden overflow. Returns true if an additional div level is required (e.g. IE 9).
 */
scout.Device.prototype.isTableAdditionalDivRequired = function() {
  return this.supportsFeature('_tableAdditionalDivRequired', function(property) {
    var $test = $('body')
      .appendDiv()
      .text('Scout')
      .css('visibility', 'hidden')
      .css('display', 'table-cell')
      .css('max-width', '1px')
      .css('overflow', 'hidden');
    var w = $test.width();
    $test.remove();
    // Expected width is 1px, however this value could be larger when the browser zoom level
    // is not set to 100% (e.g. 1.6px). To be on the safe side, we use a threshold of 5px.
    // (If max-width is not supported, the width of the test text will be > 30px.)
    return (w > 5);
  }.bind(this));
};

/**
 *  https://bugs.chromium.org/p/chromium/issues/detail?id=740502
 */
scout.Device.prototype.hasTableCellZoomBug = function() {
  return this.browser === scout.Device.Browser.CHROME;
};

scout.Device.prototype.requiresIframeSecurityAttribute = function() {
  return this.supportsFeature('_requiresIframeSecurityAttribute', function(property) {
    var test = document.createElement('iframe');
    var supportsSandbox = ('sandbox' in test);

    if (supportsSandbox) {
      return false;
    } else {
      return ('security' in test);
    }
  }.bind(this));
};

scout.Device.prototype._detectScrollbarWidth = function(cssClass) {
  var $measure = $('body')
    .appendDiv(cssClass)
    .attr('id', 'MeasureScrollbar')
    .css('width', 50)
    .css('height', 50)
    .css('overflow-y', 'scroll'),
    measureElement = $measure[0];
  var scrollbarWidth = measureElement.offsetWidth - measureElement.clientWidth;
  $measure.remove();
  return scrollbarWidth;
};

scout.Device.prototype.toString = function() {
  return 'scout.Device[' +
    'system=' + this.system +
    ' browser=' + this.browser +
    ' browserVersion=' + this.browserVersion +
    ' type=' + this.type +
    ' scrollbarWidth=' + this.scrollbarWidth +
    ' features=' + JSON.stringify(this.features) + ']';
};

scout.addAppListener('prepare', function() {
  if (scout.device) {
    // if the device was created before the app itself, use it instead of creating a new one
    return;
  }
  scout.device = scout.create('Device', {
    userAgent: navigator.userAgent
  });
});
