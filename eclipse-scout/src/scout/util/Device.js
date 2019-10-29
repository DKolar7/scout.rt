/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
/* global FastClick */

import * as scout from '../scout';
import App from '../App';

let instance = null;

/**
 * Provides information about the device and its supported features.<p>
 * The informations are detected lazily.
 *
 * @singleton
 */
export default class Device {
  constructor(model) {
    // user agent string from browser
    this.userAgent = model.userAgent;
    this.features = {};
    this.system = System.UNKNOWN;
    this.type = Type.DESKTOP;
    this.browser = Browser.UNKNOWN;
    this.browserVersion = 0;

    // --- device specific configuration
    // initialize with empty string so that it can be used without calling initUnselectableAttribute()
    // this property is used with regular JQuery attr(key, value) Syntax and in cases where we create
    // DOM elements by creating a string.
    this.unselectableAttribute = DEFAULT_UNSELECTABLE_ATTRIBUTE;
    this.tableAdditionalDivRequired = false;

    if (this.userAgent) {
      this._parseSystem();
      this._parseSystemVersion();
      this._parseBrowser();
      this._parseBrowserVersion();
    }
  }

  /**
   * Called during bootstrap by index.html before the session startup.<p>
   * Precalculates the value of some attributes to store them
   * in a static way (and prevent many repeating function calls within loops).<p>
   * Also loads device specific scripts (e.g. fast click for ios devices)
   */
  bootstrap() {
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
  }

  /**
   * The 300ms delay exists because the browser does not know whether the user wants to just tab or wants to zoom using double tab.
   * Therefore most browsers add the delay only if zoom is enabled. This works for firefox, chrome (>=32) and safari/ios (>=9.3).
   * It does not work if safari is opened in standalone/homescreen mode or in cordova. For IE (and safari since ios 9.3) it can be disabled using a css property called touch-action.
   * By default, zooming is disabled and home screen mode is enabled, see meta tags viewport and apple-mobile-web-app-capable in head.html
   * <p>
   * @return true if it is an older iOS (< 9.3), running in homescreen mode or running in a cordova container. Otherwise false.
   */
  _needsFastClick() {
    if (!this.isIos()) {
      // Currently only IOS still has the issue -> don't load the script for other systems and browsers
      return false;
    }

    if (this.systemVersion >= 9.3 && !this.isStandalone() && this.browser !== Browser.UNKNOWN) {
      // With iOS >= 9.3 the delay is gone if zooming is disabled, but not for the home screen / web app mode.
      // It is also necessary if running in a cordova container (browser is set to unknown in that case)
      return false;
    }

    // -> load only for older IOS devices or if running in home screen mode or cordova
    return true;
  }

  _loadFastClickDeferred() {
    return this._loadScriptDeferred('res/fastclick-1.0.6.js', function() {
      FastClick.attach(document.body);
      $.log.isInfoEnabled() && $.log.info('FastClick script loaded and attached');
    });
  }

  _loadScriptDeferred(scriptUrl, doneFunc) {
    return $
      .injectScript(scriptUrl)
      .done(doneFunc);
  }

  /**
   * IOs does only trigger :active when touching an element if a touchstart listener is attached
   * Unfortunately, the :active is also triggered when scrolling, there is no delay.
   * To fix this we would have to work with a custom active class which will be toggled on touchstart/end
   */
  _installActiveHandler() {
    document.addEventListener('touchstart', function() {
    }, false);
  }

  hasOnScreenKeyboard() {
    return this.supportsFeature('_onScreenKeyboard', function() {
      return this.isIos() || this.isAndroid() || this.isWindowsTabletMode();
    }.bind(this));
  }

  /**
   * Returns if the current browser includes the padding-right-space in the scrollWidth calculations.<br>
   * Such a browser increases the scrollWidth only if the text-content exceeds the space <i>including</i> the right-padding.
   * This means the scrollWidth is equal to the clientWidth until the right-padding-space is consumed as well.
   */
  isScrollWidthIncludingPadding() {
    return this.isInternetExplorer() || this.isFirefox() || this.isEdge();
  }

  /**
   * Safari shows a tooltip if ellipsis are displayed due to text truncation. This is fine but, unfortunately, it cannot be prevented.
   * Because showing two tooltips at the same time (native and custom) is bad, the custom tooltip cannot be displayed.
   * @returns {Boolean}
   */
  isCustomEllipsisTooltipPossible() {
    return this.browser !== Browser.SAFARI;
  }

  isIos() {
    return System.IOS === this.system;
  }

  isEdge() {
    return Browser.EDGE === this.browser;
  }

  isInternetExplorer() {
    return Browser.INTERNET_EXPLORER === this.browser;
  }

  isFirefox() {
    return Browser.FIREFOX === this.browser;
  }

  /**
   * Compared to isIos() this function uses navigator.platform instead of navigator.userAgent to check whether the app runs on iOS.
   * Most of the time isIos() is the way to go.
   * This function was mainly introduced to detect whether it is a real iOS or an emulated one (e.g. using chrome emulator).
   * @returns true if the platform is iOS, false if not (e.g. if chrome emulator is running)
   */
  isIosPlatform() {
    return /iPad|iPhone|iPod/.test(navigator.platform);
  }

  isAndroid() {
    return System.ANDROID === this.system;
  }

  /**
   * The best way we have to detect a Microsoft Surface Tablet in table mode is to check if
   * the scrollbar width is 0 pixel. In desktop mode the scrollbar width is > 0 pixel.
   */
  isWindowsTabletMode() {
    return System.WINDOWS === this.system && this.systemVersion >= 10 && this.scrollbarWidth === 0;
  }

  /**
   * @returns true if navigator.standalone is true which is the case for iOS home screen mode
   */
  isStandalone() {
    return !!window.navigator.standalone;
  }

  /**
   * This method returns false for very old browsers. Basically we check for the first version
   * that supports ECMAScript 5. This methods excludes all browsers that are known to be
   * unsupported, all others (e.g. unknown engines) are allowed by default.
   */
  isSupportedBrowser(browser, version) {
    browser = scout.nvl(browser, this.browser);
    version = scout.nvl(version, this.browserVersion);
    var browsers = Browser;
    if ((browser === browsers.INTERNET_EXPLORER && version < 11) ||
      (browser === browsers.CHROME && version < 40) ||
      (browser === browsers.FIREFOX && version < 35) ||
      (browser === browsers.SAFARI && version < 8)) {
      return false;
    }
    return true;
  }

  /**
   * Can not detect type until DOM is ready because we must create a DIV to measure the scrollbars.
   */
  _detectType(userAgent) {
    if (System.ANDROID === this.system) {
      if (userAgent.indexOf('Mobile') > -1) {
        return Type.MOBILE;
      } else {
        return Type.TABLET;
      }
    } else if (System.IOS === this.system) {
      if (userAgent.indexOf('iPad') > -1) {
        return Type.TABLET;
      } else {
        return Type.MOBILE;
      }
    } else if (this.isWindowsTabletMode()) {
      return Type.TABLET;
    }
    return Type.DESKTOP;
  }

  _parseSystem() {
    var userAgent = this.userAgent;
    if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
      this.system = System.IOS;
    } else if (userAgent.indexOf('Android') > -1) {
      this.system = System.ANDROID;
    } else if (userAgent.indexOf('Windows') > -1) {
      this.system = System.WINDOWS;
    }
  }

  /**
   * Currently only supports IOS
   */
  _parseSystemVersion() {
    var versionRegex,
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
  }

  _parseBrowser() {
    var userAgent = this.userAgent;

    if (userAgent.indexOf('Firefox') > -1) {
      this.browser = Browser.FIREFOX;
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
      this.browser = Browser.INTERNET_EXPLORER;
    } else if (userAgent.indexOf('Edge') > -1) {
      // must check for Edge before we do other checks, because the Edge user-agent string
      // also contains matches for Chrome and Webkit.
      this.browser = Browser.EDGE;
    } else if (userAgent.indexOf('Chrome') > -1) {
      this.browser = Browser.CHROME;
    } else if (userAgent.indexOf('Safari') > -1) {
      this.browser = Browser.SAFARI;
    }
  }

  /**
   * Version regex only matches the first number pair
   * but not the revision-version. Example:
   * - 21     match: 21
   * - 21.1   match: 21.1
   * - 21.1.3 match: 21.1
   */
  _parseBrowserVersion() {
    var versionRegex,
      browsers = Browser,
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
  }

  _parseVersion(userAgent, versionRegex) {
    var matches = versionRegex.exec(userAgent);
    if (Array.isArray(matches) && matches.length === 2) {
      return parseFloat(matches[1]);
    }
  }

  supportsFeature(property, checkFunc) {
    if (this.features[property] === undefined) {
      this.features[property] = checkFunc(property);
    }
    return this.features[property];
  }

  /**
   * Currently this method should be used when you want to check if the device is "touch only" -
   * which means the user has no keyboard or mouse. Some hybrids like Surface tablets in desktop mode are
   * still touch devices, but support keyboard and mouse at the same time. In such cases this method will
   * return false, since the device is not touch only.
   *
   * Currently this method returns the same as hasOnScreenKeyboard(). Maybe the implementation here will be
   * different in the future.
   */
  supportsTouch() {
    return this.supportsFeature('_touch', this.hasOnScreenKeyboard.bind(this));
  }

  supportsFile() {
    return (window.File ? true : false);
  }

  /**
   * Some browsers support the file API but don't support the File constructor (new File()).
   */
  supportsFileConstructor() {
    return typeof File === 'function';
  }

  supportsCssAnimation() {
    return this.supportsCssProperty('animation');
  }

  /**
   * Used to determine if browser supports full history API.
   * Note that IE9 only partially supports the API, pushState and replaceState functions are missing.
   * @see: https://developer.mozilla.org/de/docs/Web/API/Window/history
   */
  supportsHistoryApi() {
    return !!(window.history && window.history.pushState);
  }

  supportsCssGradient() {
    var testValue = 'linear-gradient(to left, #000 0%, #000 50%, transparent 50%, transparent 100% )';
    return this.supportsFeature('gradient', this.checkCssValue.bind(this, 'backgroundImage', testValue, function(actualValue) {
      return (actualValue + '').indexOf('gradient') > 0;
    }));
  }

  supportsCssUserSelect() {
    return this.supportsCssProperty('userSelect');
  }

  supportsInternationalization() {
    return window.Intl && typeof window.Intl === 'object';
  }

  /**
   * Returns true if the device supports the download of resources in the same window as the single page app is running.
   * With "download" we mean: change <code>window.location.href</code> to the URL of the resource to download. Some browsers don't
   * support this behavior and require the resource to be opened in a new window with <code>window.open</code>.
   */
  supportsDownloadInSameWindow() {
    return Browser.FIREFOX !== this.browser;
  }

  hasPrettyScrollbars() {
    return this.supportsFeature('_prettyScrollbars', function check(property) {
      return this.scrollbarWidth === 0;
    }.bind(this));
  }

  canHideScrollbars() {
    return this.supportsFeature('_canHideScrollbars', function check(property) {
      // Check if scrollbar is vanished if class hybrid-scrollable is applied which hides the scrollbar, see also scrollbars.js and Scrollbar.less
      return this._detectScrollbarWidth('hybrid-scrollable') === 0;
    }.bind(this));
  }

  supportsCopyFromDisabledInputFields() {
    return Browser.FIREFOX !== this.browser;
  }

  /**
   * If the mouse down on an element with a pseudo element removes the pseudo element (e.g. check box toggling),
   * the firefox cannot focus the element anymore and instead focuses the body. In that case manual focus handling is necessary.
   */
  loosesFocusIfPseudoElementIsRemoved() {
    return Browser.FIREFOX === this.browser;
  }

  supportsCssProperty(property) {
    return this.supportsFeature(property, function check(property) {
      if (document.body.style[property] !== undefined) {
        return true;
      }

      property = property.charAt(0).toUpperCase() + property.slice(1);
      for (var i = 0; i < vendorPrefixes.length; i++) {
        if (document.body.style[vendorPrefixes[i] + property] !== undefined) {
          return true;
        }
      }
      return false;
    });
  }

  supportsGeolocation() {
    if (navigator.geolocation) {
      return true;
    }
    return false;
  }

  /**
   * When we call .preventDefault() on a mousedown event Firefox doesn't apply the :active state.
   * Since W3C does not specify an expected behavior, we need this workaround for consistent behavior in
   * our UI. The issue has been reported to Mozilla but it doesn't look like there will be a bugfix soon:
   *
   * https://bugzilla.mozilla.org/show_bug.cgi?id=771241#c7
   */
  requiresSyntheticActiveState() {
    return this.isFirefox();
  }

  supportsPassiveEventListener() {
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
      } catch (err) {
        passiveSupported = false;
      }
      return passiveSupported;
    }.bind(this));
  }

  checkCssValue(property, value, checkFunc) {
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
    for (var i = 0; i < vendorPrefixes.length; i++) {
      var vendorProperty = vendorPrefixes[i] + property;
      if (document.body.style[vendorProperty] !== undefined) {
        div.style[vendorProperty] = value;
        if (checkFunc(div.style[vendorProperty])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns '' for modern browsers, that support the 'user-select' CSS property.
   * Returns ' unselectable="on"' for IE9.
   * This string can be used to add to any HTML element as attribute.
   */
  getUnselectableAttribute() {
    return this.supportsFeature('_unselectableAttribute', function(property) {
      if (this.supportsCssUserSelect()) {
        return DEFAULT_UNSELECTABLE_ATTRIBUTE;
      }
      // required for IE 9
      return {
        key: 'unselectable',
        value: 'on',
        string: ' unselectable="on"'
      };
    }.bind(this));
  }

  /**
   * Returns false for modern browsers, that support CSS table-cell properties restricted with a
   * max-width and hidden overflow. Returns true if an additional div level is required (e.g. IE 9).
   */
  isTableAdditionalDivRequired() {
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
  }

  requiresIframeSecurityAttribute() {
    return this.supportsFeature('_requiresIframeSecurityAttribute', function(property) {
      var test = document.createElement('iframe');
      var supportsSandbox = ('sandbox' in test);

      if (supportsSandbox) {
        return false;
      } else {
        return ('security' in test);
      }
    }.bind(this));
  }

  _detectScrollbarWidth(cssClass) {
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
  }

  toString() {
    return 'scout.Device[' +
      'system=' + this.system +
      ' browser=' + this.browser +
      ' browserVersion=' + this.browserVersion +
      ' type=' + this.type +
      ' scrollbarWidth=' + this.scrollbarWidth +
      ' features=' + JSON.stringify(this.features) + ']';
  }

  static get() {
    return instance;
  }
}

export const DEFAULT_UNSELECTABLE_ATTRIBUTE = {
  key: null,
  value: null,
  string: ''
};

const vendorPrefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'];

export const Browser = {
  UNKNOWN: 'Unknown',
  FIREFOX: 'Firefox',
  CHROME: 'Chrome',
  INTERNET_EXPLORER: 'InternetExplorer',
  EDGE: 'Edge',
  SAFARI: 'Safari'
};

export const System ={
  UNKNOWN: 'Unknown',
  IOS: 'IOS',
  ANDROID: 'ANDROID',
  WINDOWS: 'WINDOWS'
};

export const Type = {
  DESKTOP: 'DESKTOP',
  TABLET: 'TABLET',
  MOBILE: 'MOBILE'
};

App.addListener('prepare', function() {
  if (instance) {
    // if the device was created before the app itself, use it instead of creating a new one
    return;
  }
  instance = scout.create(Device, {
    userAgent: navigator.userAgent
  });
});
