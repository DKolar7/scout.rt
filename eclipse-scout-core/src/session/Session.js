/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {
  AjaxCall,
  App,
  arrays,
  BackgroundJobPollingStatus,
  BackgroundJobPollingSupport,
  Device,
  EventSupport,
  FileInput,
  files as fileUtil,
  FocusManager,
  fonts,
  LayoutValidator,
  Locale,
  MessageBox,
  ModelAdapter,
  NullWidget,
  ObjectFactory,
  objects,
  Reconnector,
  RemoteEvent,
  ResponseQueue,
  scout,
  Status,
  strings,
  TextMap,
  texts,
  TypeDescriptor,
  URL,
  UserAgent,
  webstorage
} from '../index';
import $ from 'jquery';

export default class Session {
  constructor() {
    this.$entryPoint = null;
    this.partId = 0;

    this.url = new URL();
    this.userAgent = new UserAgent({
      deviceType: Device.get().type,
      touch: Device.get().supportsOnlyTouch(),
      standalone: Device.get().isStandalone()
    });
    this.locale = null;
    this.textMap = new TextMap();

    this.ready = false; // true after desktop has been completely rendered
    this.unloading = false; // true when 'beforeOnload' event has been triggered
    this.unloaded = false; // true after unload event has been received from the window
    this.loggedOut = false;
    this.inspector = false;
    this.persistent = false;
    this.desktop = null;
    this.layoutValidator = new LayoutValidator();
    this.focusManager = null;
    this.keyStrokeManager = null;

    this.uiSessionId = null; // assigned by server on session startup (OWASP recommendation, see https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29_Prevention_Cheat_Sheet#General_Recommendation:_Synchronizer_Token_Pattern).
    this.clientSessionId = this._getClientSessionIdFromStorage();
    this.forceNewClientSession = false;
    this.remoteUrl = 'json';
    this.unloadUrl = 'unload';
    this.modelAdapterRegistry = {};
    this.ajaxCalls = [];
    this.asyncEvents = [];
    this.responseQueue = new ResponseQueue(this);
    this.requestsPendingCounter = 0;
    this.suppressErrors = false;
    this.requestTimeoutCancel = 5000; // ms
    this.requestTimeoutPoll = 75000; // ms, depends on polling interval, will therefore be initialized on startup
    this.requestTimeoutPing = 5000; // ms
    this.backgroundJobPollingSupport = new BackgroundJobPollingSupport(true);
    this.reconnector = new Reconnector(this);
    this.processingEvents = false;

    // This property is enabled by URL parameter &adapterExportEnabled=1. Default is false
    this.adapterExportEnabled = false;
    this._adapterDataCache = {};
    this._busy = false;
    this._busyIndicator = null;
    this._busyIndicatorTimeoutId = null;
    this._deferred = null;
    this._fatalMessagesOnScreen = {};
    this._retryRequest = null;
    this._queuedRequest = null;
    this.requestSequenceNo = 0;

    this.rootAdapter = new ModelAdapter();
    this.rootAdapter.init({
      session: this,
      id: '1',
      objectType: 'RootAdapter'
    });

    let rootParent = new NullWidget();
    rootParent.session = this;
    rootParent.initialized = true;

    this.root = this.rootAdapter.createWidget({
      session: this,
      id: '1',
      objectType: 'NullWidget'
    }, rootParent);
    this.events = this._createEventSupport();
  }

  // Corresponds to constants in JsonResponse
  static JsonResponseError = {
    STARTUP_FAILED: 5,
    SESSION_TIMEOUT: 10,
    UI_PROCESSING: 20,
    UNSAFE_UPLOAD: 30,
    REJECTED_UPLOAD: 31,
    VERSION_MISMATCH: 40
  };

  // Placeholder string for an empty filename
  static EMPTY_UPLOAD_FILENAME = '*empty*';

  /**
   * $entryPoint is required to create a new session.
   *
   * @param model The 'model' argument holds all optional values that may be used during
   * initialization (it is the same object passed to the scout.init() function).
   * @param [model.portletPartId]
   *     Optional, default is 0. Necessary when multiple UI sessions are managed
   *     by the same window (portlet support). Each session's partId must be unique.
   * @param model.clientSessionId
   *     Identifies the 'client instance' on the UI server. If the property is not set
   *     (which is the default case), the clientSessionId is taken from the browser's
   *     session storage (per browser window, survives F5 refresh of page). If no
   *     clientSessionId can be found, a new one is generated on the server.
   * @param [model.userAgent]
   *     Default: DESKTOP
   * @param [model.backgroundJobPollingEnabled]
   *     Unless websockets is used, this property turns on (default) or off background
   *     polling using an async ajax call together with setTimeout()
   * @param [model.suppressErrors]
   *     Basically added because of Jasmine-tests. When working with async tests that
   *     use setTimeout(), sometimes the Jasmine-Maven plug-in fails and aborts the
   *     build because there were console errors. These errors always happen in this
   *     class. That's why we can skip suppress error handling with this flag.
   * @param [model.focusManagerActive]
   *     Forces the focus manager to be active or not. If undefined, the value is
   *     auto detected by Device.js.
   * @param [model.reconnectorOptions]
   *     Optional, properties of this object are copied to the Session's reconnector
   *     instance (see Reconnector.js).
   * @param [model.ajaxCallOptions]
   *     Optional, properties of this object are copied to all instances of AjaxCall.js.
   */
  init(model) {
    let options = model || {};

    if (!options.$entryPoint) {
      throw new Error('$entryPoint is not defined');
    }
    this.$entryPoint = options.$entryPoint;
    this.partId = scout.nvl(options.portletPartId, this.partId);
    this.forceNewClientSession = scout.nvl(this.url.getParameter('forceNewClientSession'), options.forceNewClientSession);
    if (this.forceNewClientSession) {
      this.clientSessionId = null;
    } else {
      this.clientSessionId = scout.nvl(options.clientSessionId, this.clientSessionId);
    }
    this.userAgent = scout.nvl(options.userAgent, this.userAgent);
    this.suppressErrors = scout.nvl(options.suppressErrors, this.suppressErrors);
    if (options.locale) {
      this.locale = Locale.ensure(options.locale);
      this.textMap = texts.get(this.locale.languageTag);
    }
    if (options.backgroundJobPollingEnabled === false) {
      this.backgroundJobPollingSupport.enabled = false;
    }
    $.extend(this.reconnector, options.reconnectorOptions);
    this.ajaxCallOptions = options.ajaxCallOptions;

    // Set inspector flag by looking at URL params. This is required when running in offline mode.
    // In online mode, the server may override this flag again, see _processStartupResponse().
    if (this.url.getParameter('debug') === 'true' || this.url.getParameter('inspector') === 'true') {
      this.inspector = true;
    }

    if (this.url.getParameter('adapterExportEnabled') === 'true') {
      this.adapterExportEnabled = true;
    }

    // Install focus management for this session (cannot be created in constructor, because this.$entryPoint is required)
    this.focusManager = new FocusManager({
      session: this,
      active: options.focusManagerActive
    });
    this.keyStrokeManager = scout.create('KeyStrokeManager', {
      session: this
    });
  }

  _throwError(message) {
    if (!this.suppressErrors) {
      throw new Error(message);
    }
  }

  unregisterModelAdapter(modelAdapter) {
    delete this.modelAdapterRegistry[modelAdapter.id];
  }

  registerModelAdapter(modelAdapter) {
    if (modelAdapter.id === undefined) {
      throw new Error('modelAdapter.id must be defined');
    }
    this.modelAdapterRegistry[modelAdapter.id] = modelAdapter;
  }

  getModelAdapter(id) {
    return this.modelAdapterRegistry[id];
  }

  getWidget(adapterId) {
    if (!adapterId) {
      return null;
    }
    if (typeof adapterId !== 'string') {
      throw new Error('typeof adapterId must be string');
    }
    let adapter = this.getModelAdapter(adapterId);
    if (!adapter) {
      return null;
    }
    return adapter.widget;
  }

  getOrCreateWidget(adapterId, parent, strict) {
    if (!adapterId) {
      return null;
    }
    if (typeof adapterId !== 'string') {
      throw new Error('typeof adapterId must be string');
    }
    let widget = this.getWidget(adapterId);
    if (widget) {
      return widget;
    }
    let adapterData = this._getAdapterData(adapterId);
    if (!adapterData) {
      if (scout.nvl(strict, true)) {
        throw new Error('no adapterData found for adapterId=' + adapterId);
      }
      return null;
    }
    let adapter = this.createModelAdapter(adapterData);
    return adapter.createWidget(adapterData, parent);
  }

  createModelAdapter(adapterData) {
    let objectType = adapterData.objectType;
    let createOpts = {};

    let objectInfo = TypeDescriptor.parse(objectType);
    if (objectInfo.modelVariant) {
      objectType = objectInfo.objectType.toString() + 'Adapter' + ObjectFactory.MODEL_VARIANT_SEPARATOR + objectInfo.modelVariant.toString();
      // If no adapter exists for the given variant then create an adapter without variant.
      // Mostly variant is only essential for the widget, not the adapter
      createOpts.variantLenient = true;
    } else {
      objectType = objectInfo.objectType.toString() + 'Adapter';
    }

    // TODO [7.0] bsh, cgu: Add classId/modelClass? Think about if IDs should be different for widgets (maybe prefix with 'w')
    let adapterModel = {
      id: adapterData.id,
      session: this
    };
    let adapter = scout.create(objectType, adapterModel, createOpts);
    $.log.isTraceEnabled() && $.log.trace('created new adapter ' + adapter);
    return adapter;
  }

  /**
   * Sends the request asynchronously and processes the response later.<br>
   * Furthermore, the request is sent delayed. If send is called multiple times
   * during the same user interaction, the events are collected and sent in one
   * request at the end of the user interaction
   */
  sendEvent(event, delay) {
    delay = delay || 0;

    this.asyncEvents = this._coalesceEvents(this.asyncEvents, event);
    this.asyncEvents.push(event);
    // Use the specified delay, except another event is already scheduled. In that case, use the minimal delay.
    // This ensures that an event with a long delay doesn't hold back another event with a short delay.
    this._asyncDelay = Math.min(delay, scout.nvl(this._asyncDelay, delay));

    clearTimeout(this._sendTimeoutId);
    this._sendTimeoutId = setTimeout(() => {
      this._sendTimeoutId = null;
      this._asyncDelay = null;
      if (this.areRequestsPending()) {
        // do not send if there are any requests pending because the order matters -> prevents race conditions
        return;
      }
      this._sendNow();
    }, this._asyncDelay);
  }

  _sendStartupRequest() {
    // Build startup request (see JavaDoc for JsonStartupRequest.java for details)
    let request = this._newRequest({
      startup: true
    });
    if (this.partId) {
      request.partId = this.partId;
    }
    if (this.clientSessionId) {
      request.clientSessionId = this.clientSessionId;
    }
    if (App.get().version) {
      request.version = App.get().version;
    }
    request.userAgent = this.userAgent;
    request.sessionStartupParams = this._createSessionStartupParams();

    // Send request
    let ajaxOptions = this.defaultAjaxOptions(request);

    return $.ajax(ajaxOptions)
      .catch(onAjaxFail.bind(this))
      .then(onAjaxDone.bind(this));

    // ----- Helper methods -----

    function onAjaxDone(data) {
      this._processStartupResponse(data);
      if (data.error) {
        return $.rejectedPromise(data);
      }
    }

    function onAjaxFail(jqXHR, textStatus, errorThrown, ...args) {
      this._setApplicationLoading(false);
      this._processErrorResponse(jqXHR, textStatus, errorThrown, request);
      return $.rejectedPromise(jqXHR, textStatus, errorThrown, ...args);
    }
  }

  /**
   * Creates an object to send to the server as "startupParams".
   *
   * Default params:
   * "url":
   *   browser URL (without query and hash part)
   * "geolocationServiceAvailable":
   *   true if browser supports geo location services
   *
   * Additionally, all query parameters from the URL are put in the resulting object.
   */
  _createSessionStartupParams() {
    let params = {
      url: this.url.baseUrlRaw,
      geolocationServiceAvailable: Device.get().supportsGeolocation()
    };

    // Extract query parameters from URL and put them in the resulting object
    let urlParameterMap = this.url.parameterMap;
    for (let prop in urlParameterMap) {
      params[prop] = urlParameterMap[prop];
    }
    return params;
  }

  /**
   * @param {[]} data.adapterData
   * @param {[]} data.events
   * @param data.startupData
   * @param data.startupData.clientSession
   * @param data.startupData.pollingInterval
   * @param data.error
   * @param data.sessionTerminated
   */
  _processStartupResponse(data) {
    // Handle errors from server
    if (data.error) {
      this._processErrorJsonResponse(data.error);
      return;
    }

    webstorage.removeItemFromSessionStorage('scout:versionMismatch');

    if (!data.startupData) {
      throw new Error('Missing startupData');
    }

    // Mark session as persistent (means a persistent session cookie is used and the client session will be restored after a browser restart)
    this.persistent = data.startupData.persistent;

    // Store clientSessionId in sessionStorage (to send the same ID again on page reload)
    this.clientSessionId = data.startupData.clientSessionId;
    this._storeClientSessionIdInStorage(this.clientSessionId);

    // Assign server generated uiSessionId. It must be sent along with all further requests.
    this.uiSessionId = data.startupData.uiSessionId;

    // Destroy UI session on server when page is closed or reloaded
    $(window)
      .on('beforeunload.' + this.uiSessionId, this._onWindowBeforeUnload.bind(this))
      .on('unload.' + this.uiSessionId, this._onWindowUnload.bind(this));

    // Special case: Page must be reloaded on startup (e.g. theme changed)
    if (data.startupData.reloadPage) {
      scout.reloadPage();
      return;
    }

    // Enable inspector mode if server requests it (e.g. when server is running in development mode)
    if (data.startupData.inspector) {
      this.inspector = true;
    }

    // Init request timeout for poller
    this.requestTimeoutPoll = (data.startupData.pollingInterval + 15) * 1000;

    // Register UI session
    this.modelAdapterRegistry[this.uiSessionId] = this; // TODO [7.0] cgu: maybe better separate session object from event processing, create ClientSession.js?. If yes, desktop should not have rootadapter as parent, see 406

    // Store adapters to adapter data cache
    if (data.adapterData) {
      this._copyAdapterData(data.adapterData);
    }

    this.locale = new Locale(data.startupData.locale);
    this.textMap = texts.get(this.locale.languageTag);
    this.textMap.addAll(data.startupData.textMap);

    // Create the desktop
    // Extract client session data without creating a model adapter for it. It is (currently) only used to transport the desktop's adapterId.
    let clientSessionData = this._getAdapterData(data.startupData.clientSession);
    this.desktop = this.getOrCreateWidget(clientSessionData.desktop, this.rootAdapter.widget);
    let renderDesktopImpl = function() {
      this._renderDesktop();

      // In case the server sent additional events, process them
      if (data.events) {
        this.processingEvents = true;
        try {
          this._processEvents(data.events);
        } finally {
          this.processingEvents = false;
        }
      }

      // Ensure layout is valid (explicitly layout immediately and don't wait for setTimeout to run to make layouting invisible to the user)
      this.layoutValidator.validate();
      this.focusManager.validateFocus();

      // Start poller
      this._resumeBackgroundJobPolling();

      this.ready = true;

      $.log.isInfoEnabled() && $.log.info('Session initialized. Detected ' + Device.get());
      if ($.log.isDebugEnabled()) {
        $.log.isDebugEnabled() && $.log.debug('size of _adapterDataCache after session has been initialized: ' + objects.countOwnProperties(this._adapterDataCache));
        $.log.isDebugEnabled() && $.log.debug('size of modelAdapterRegistry after session has been initialized: ' + objects.countOwnProperties(this.modelAdapterRegistry));
      }
    }.bind(this);

    this.render(renderDesktopImpl);
  }

  _storeClientSessionIdInStorage(clientSessionId) {
    let key = 'scout:clientSessionId';
    webstorage.removeItemFromSessionStorage(key);
    webstorage.removeItemFromLocalStorage(key);
    if (this.persistent) {
      webstorage.setItemToLocalStorage(key, clientSessionId);
    } else {
      webstorage.setItemToSessionStorage(key, clientSessionId);
    }
  }

  _getClientSessionIdFromStorage() {
    let key = 'scout:clientSessionId';
    let id = webstorage.getItemFromSessionStorage(key);
    if (!id) {
      // If the session is persistent it was stored in the local storage (cannot check for this.persistent here because it is not known yet)
      id = webstorage.getItemFromLocalStorage(key);
    }
    return id;
  }

  render(renderFunc) {
    // Render desktop after fonts have been preloaded (this fixes initial layouting issues when font icons are not yet ready)
    if (fonts.loadingComplete) {
      renderFunc();
    } else {
      fonts.preloader().then(renderFunc);
    }
  }

  _sendUnloadRequest() {
    let request = this._newRequest({
      unload: true,
      showBusyIndicator: false
    });
    // Send request
    this._sendRequest(request);
  }

  _sendNow() {
    if (this.asyncEvents.length === 0) {
      // Nothing to send -> return
      return;
    }
    // If an event requires a new request, only the previous events are sent now.
    // The next requests are send the next time _sendNow is called (-> when the response to the current request arrives)
    let events = [];
    this.asyncEvents.some((event, i) => {
      if (event.newRequest && events.length > 0) {
        return true;
      }
      events.push(event);
      return false;
    });
    let request = this._newRequest({
      events: events
    });
    // Busy indicator required when at least one event requests it
    request.showBusyIndicator = request.events.some(event => {
      return scout.nvl(event.showBusyIndicator, true);
    });
    this.responseQueue.prepareRequest(request);
    // Send request
    this._sendRequest(request);
    // Remove the events which are sent now from the list, keep the ones which are sent later
    this.asyncEvents = this.asyncEvents.slice(events.length);
  }

  _coalesceEvents(previousEvents, event) {
    if (!event.coalesce) {
      return previousEvents;
    }
    let filter = $.negate(event.coalesce).bind(event);
    return previousEvents.filter(filter);
  }

  _sendRequest(request) {
    if (!request) {
      return; // nothing to send
    }

    if (this.loggedOut) {
      // Don't send any JSON requests when we are logged out. They would fail since the UI session
      // no longer exists. This could happen when views are open and the client session is stopped.
      // Destroying the form adapters makes the Desktop send an "activeForm = null" event.
      return;
    }

    if (this.offline && !request.unload) { // In Firefox, "offline" is already true when page is unloaded
      this._handleSendWhenOffline(request);
      return;
    }

    if (request.unload && navigator.sendBeacon) {
      // The unload request must _not_ be sent asynchronously, because the browser would cancel
      // it when the page unload is completed. Because the support for synchronous AJAX request
      // will apparently be dropped eventually, we use the "sendBeacon" method to send the unload
      // request to the server (we don't expect an answer). Not all browsers support this method,
      // therefore we check for its existence and fall back to (legacy) synchronous AJAX call
      // when it is missing. More information:
      // - http://stackoverflow.com/questions/15479103/can-beforeunload-unload-be-used-to-send-xmlhttprequests-reliably
      // - https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/7nKMdg_ALcc
      // - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
      navigator.sendBeacon(this.unloadUrl + '/' + this.uiSessionId, '');
      return;
    }

    let ajaxOptions = this.defaultAjaxOptions(request);

    let busyHandling = scout.nvl(request.showBusyIndicator, true);
    if (request.unload) {
      ajaxOptions.async = false;
    }
    this._performUserAjaxRequest(ajaxOptions, busyHandling, request);
  }

  _handleSendWhenOffline(request) {
    // No need to queue the request when request does not contain events (e.g. log request, unload request)
    if (!request.events) {
      return;
    }

    // Merge request with queued event
    if (this._queuedRequest) {
      if (this._queuedRequest.events) {
        // 1. Remove request events from queued events
        request.events.forEach(event => {
          this._queuedRequest.events = this._coalesceEvents(this._queuedRequest.events, event);
        });
        // 2. Add request events to end of queued events
        this._queuedRequest.events = this._queuedRequest.events.concat(request.events);
      } else {
        this._queuedRequest.events = request.events;
      }
    } else {
      this._queuedRequest = request;
    }
    this.layoutValidator.validate();
  }

  defaultAjaxOptions(request) {
    request = request || this._newRequest();
    let url = this._decorateUrl(this.remoteUrl, request);

    let ajaxOptions = {
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json; charset=UTF-8',
      cache: false,
      url: url,
      data: this._requestToJson(request)
    };

    // Ensure that certain request don't run forever. When a timeout occurs, the session
    // is put into offline mode. Note that normal requests should NOT be limited, because
    // the server processing might take very long (e.g. long running database query).
    ajaxOptions.timeout = 0; // "infinite"
    if (request.cancel) {
      ajaxOptions.timeout = this.requestTimeoutCancel;
    }
    if (request.ping) {
      ajaxOptions.timeout = this.requestTimeoutPing;
    }
    if (request.pollForBackgroundJobs) {
      ajaxOptions.timeout = this.requestTimeoutPoll;
    }
    return ajaxOptions;
  }

  _decorateUrl(url, request) {
    let urlHint = null;
    // Add dummy URL parameter as marker (for debugging purposes)
    if (request.unload) {
      urlHint = 'unload';
    } else if (request.pollForBackgroundJobs) {
      urlHint = 'poll';
    } else if (request.ping) {
      urlHint = 'ping';
    } else if (request.cancel) {
      urlHint = 'cancel';
    } else if (request.log) {
      urlHint = 'log';
    } else if (request.syncResponseQueue) {
      urlHint = 'sync';
    }
    if (urlHint) {
      url = new URL(url).addParameter(urlHint)
        .toString();
    }
    return url;
  }

  _getRequestName(request, defaultName) {
    if (request) {
      if (request.unload) {
        return 'unload';
      } else if (request.pollForBackgroundJobs) {
        return 'pollForBackgroundJobs';
      } else if (request.ping) {
        return 'ping';
      } else if (request.cancel) {
        return 'cancel';
      } else if (request.log) {
        return 'log';
      } else if (request.syncResponseQueue) {
        return 'syncResponseQueue';
      }
    }
    return defaultName;
  }

  _requestToJson(request) {
    return JSON.stringify(request, function(key, value) {
      // Replacer function that filter certain properties from the resulting JSON string.
      // See https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
      let ignore =
        this === request && key === 'showBusyIndicator' ||
        this instanceof RemoteEvent && scout.isOneOf(key, 'showBusyIndicator', 'coalesce', 'newRequest');
      return ignore ? undefined : value;
    });
  }

  _callAjax(callOptions) {
    let defaultOptions = {
      retryIntervals: [100, 500, 500, 500]
    };
    let ajaxCall = scout.create('AjaxCall', $.extend(defaultOptions, callOptions, this.ajaxCallOptions), {
      ensureUniqueId: false
    });
    this.registerAjaxCall(ajaxCall);
    return ajaxCall.call()
      .always(this.unregisterAjaxCall.bind(this, ajaxCall));
  }

  _performUserAjaxRequest(ajaxOptions, busyHandling, request) {
    if (busyHandling) {
      this.setBusy(true);
    }
    this.setRequestPending(true);

    let jsError = null,
      success = false;

    this._callAjax({
      ajaxOptions: ajaxOptions,
      request: request,
      name: this._getRequestName(request, 'user request')
    })
      .done(onAjaxDone.bind(this))
      .fail(onAjaxFail.bind(this))
      .always(onAjaxAlways.bind(this));

    // ----- Helper methods -----

    function onAjaxDone(data) {
      try {
        // Busy handling is remove _before_ processing the response, otherwise the focus cannot be set
        // correctly, because the glasspane of the busy indicator is still visible.
        // The second check prevents flickering of the busy indicator if there is a scheduled request
        // that will be sent immediately afterwards (see onAjaxAlways).
        if (busyHandling && !this.areBusyIndicatedEventsQueued()) {
          this.setBusy(false);
        }
        success = this.responseQueue.process(data);
      } catch (err) {
        jsError = jsError || err;
      }
    }

    function onAjaxFail(ajaxError) {
      try {
        if (busyHandling) {
          this.setBusy(false);
        }
        this._processErrorResponse(ajaxError.jqXHR, ajaxError.textStatus, ajaxError.errorThrown, request);
      } catch (err) {
        jsError = jsError || err;
      }
    }

    // Variable arguments:
    // "done" --> data, textStatus, jqXHR
    // "fail" --> jqXHR, textStatus, errorThrown
    function onAjaxAlways(data, textStatus, errorThrown) {
      this.setRequestPending(false);

      // "success" is false when either
      // a) an HTTP error occurred or
      // b) a JSON response with the error flag set (UI processing error) was returned
      if (success) {
        this._resumeBackgroundJobPolling();
        this._fireRequestFinished(data);

        if (this._retryRequest) {
          // Send retry request first
          let retryRequest = this._retryRequest;
          this._retryRequest = null;
          this.responseQueue.prepareRequest(retryRequest);
          this._sendRequest(retryRequest);
        } else if (this._queuedRequest) {
          // Send events that happened while being offline
          let queuedRequest = this._queuedRequest;
          this._queuedRequest = null;
          this.responseQueue.prepareRequest(queuedRequest);
          this._sendRequest(queuedRequest);
        }

        // If there already is a another request pending, send it now
        // But only if it should not be sent delayed
        if (!this._sendTimeoutId) {
          this._sendNow();
        }
      } else {
        // Ensure busy is false when an error occurred an we won't be sending more requests.
        // It could still be true when here were more busy indicated events in the queue when
        // the error response was received (e.g. when selecting some table rows just when the
        // server is restarted).
        this.setBusy(false);
      }
      this.layoutValidator.validate();

      // Throw previously caught error
      if (jsError) {
        throw jsError;
      }
    }
  }

  registerAjaxCall(ajaxCall) {
    this.ajaxCalls.push(ajaxCall);
  }

  unregisterAjaxCall(ajaxCall) {
    arrays.remove(this.ajaxCalls, ajaxCall);
  }

  interruptAllAjaxCalls() {
    // Because the error handlers alter the "this.ajaxCalls" array,
    // the loop must operate on a copy of the original array!
    this.ajaxCalls.slice().forEach(ajaxCall => {
      ajaxCall.pendingCall && ajaxCall.pendingCall.abort();
    });
  }

  abortAllAjaxCalls() {
    // Because the error handlers alter the "this.ajaxCalls" array,
    // the loop must operate on a copy of the original array!
    this.ajaxCalls.slice().forEach(ajaxCall => {
      ajaxCall.abort();
    });
  }

  /**
   * (Re-)starts background job polling when not started yet or when an error occurred while polling.
   * In the latter case, polling is resumed when a user-initiated request has been successful.
   */
  _resumeBackgroundJobPolling() {
    if (this.backgroundJobPollingSupport.enabled && this.backgroundJobPollingSupport.status !== BackgroundJobPollingStatus.RUNNING) {
      $.log.isInfoEnabled() && $.log.info('Resume background jobs polling request, status was=' + this.backgroundJobPollingSupport.status);
      this._pollForBackgroundJobs();
    }
  }

  /**
   * Polls the results of jobs running in the background. Note: we cannot use the _sendRequest method here
   * since we don't want any busy handling in case of background jobs. The request may take a while, since
   * the server doesn't return until either a time-out occurs or there's something in the response when
   * a model job is done and no request initiated by a user is running.
   */
  _pollForBackgroundJobs() {
    this.backgroundJobPollingSupport.setRunning();

    let request = this._newRequest({
      pollForBackgroundJobs: true
    });
    this.responseQueue.prepareRequest(request);

    let ajaxOptions = this.defaultAjaxOptions(request);

    this._callAjax({
      ajaxOptions: ajaxOptions,
      request: request,
      name: this._getRequestName(request, 'request')
    })
      .done(onAjaxDone.bind(this))
      .fail(onAjaxFail.bind(this));

    // --- Helper methods ---

    function onAjaxDone(data) {
      if (data.error) {
        // Don't schedule a new polling request, when an error occurs
        // when the next user-initiated request succeeds, we re-enable polling
        // otherwise the polling would ping the server to death in case of an error
        $.log.warn('Polling request failed. Interrupt polling until the next user-initiated request succeeds');
        this.backgroundJobPollingSupport.setFailed();
        if (this.areRequestsPending()) {
          // Add response to queue, handle later by _performUserAjaxRequest()
          this.responseQueue.add(data);
        } else {
          // No user request pending, handle immediately
          this.responseQueue.process(data);
        }
      } else if (data.sessionTerminated) {
        $.log.info('Session terminated, stopped polling for background jobs');
        this.backgroundJobPollingSupport.setStopped();
        // If were are not yet logged out, redirect to the logout URL (the session that initiated the
        // session invalidation will receive a dedicated logout event, redirect is handled there).
        if (!this.loggedOut && data.redirectUrl) {
          this.logout(data.redirectUrl);
        }
      } else {
        try {
          // No need to change backgroundJobPollingSupport state, it should still be RUNNING
          if (this.areRequestsPending()) {
            // Add response to queue, handle later by _performUserAjaxRequest()
            this.responseQueue.add(data);
          } else {
            // No user request pending, handle immediately
            this.responseQueue.process(data);
            this.layoutValidator.validate();
          }
          setTimeout(this._pollForBackgroundJobs.bind(this));
        } catch (error) {
          this.backgroundJobPollingSupport.setFailed();
          throw error;
        }
      }
    }

    function onAjaxFail(ajaxError) {
      this.backgroundJobPollingSupport.setFailed();
      this._processErrorResponse(ajaxError.jqXHR, ajaxError.textStatus, ajaxError.errorThrown, request);
    }
  }

  /**
   * Do NOT call this method directly, always use the response queue:
   *
   *   session.responseQueue.process(data);
   *
   * Otherwise, the response queue's expected sequence number will get out of sync.
   */
  processJsonResponseInternal(data) {
    let success = false;
    if (data.error) {
      this._processErrorJsonResponse(data.error);
    } else {
      this._processSuccessResponse(data);
      success = true;
    }
    return success;
  }

  _processSuccessResponse(message) {
    if (message.adapterData) {
      this._copyAdapterData(message.adapterData);
    }

    if (message.events) {
      this.processingEvents = true;
      try {
        this._processEvents(message.events);
      } finally {
        this.processingEvents = false;
      }
    }

    if ($.log.isDebugEnabled()) {
      let cacheSize = objects.countOwnProperties(this._adapterDataCache);
      $.log.trace('size of _adapterDataCache after response has been processed: ' + cacheSize);
      cacheSize = objects.countOwnProperties(this.modelAdapterRegistry);
      $.log.trace('size of modelAdapterRegistry after response has been processed: ' + cacheSize);
    }
  }

  _copyAdapterData(adapterData) {
    let count = 0;
    let prop;

    for (prop in adapterData) {
      this._adapterDataCache[prop] = adapterData[prop];
      count++;
    }
    if (count > 0) {
      $.log.isTraceEnabled() && $.log.trace('Stored ' + count + ' properties in adapterDataCache');
    }
  }

  /**
   * @param textStatus 'timeout', 'abort', 'error' or 'parseerror' (see http://api.jquery.com/jquery.ajax/)
   */
  _processErrorResponse(jqXHR, textStatus, errorThrown, request) {
    $.log.error('errorResponse: status=' + jqXHR.status + ', textStatus=' + textStatus + ', errorThrown=' + errorThrown);

    let offlineError = AjaxCall.isOfflineError(jqXHR, textStatus, errorThrown, request);
    if (offlineError) {
      if (this.ready) {
        this.goOffline();
        if (request && !request.pollForBackgroundJobs && !this._retryRequest) {
          this._retryRequest = request;
        }
        return;
      }
      // Not ready yet (startup request)
      errorThrown = errorThrown || this.optText('ui.ConnectionInterrupted', 'Connection interrupted');
    }

    // Show error message
    let boxOptions = {
      header: this.optText('ui.NetworkError', 'Network error'),
      body: strings.join(' ', jqXHR.status || '', errorThrown),
      yesButtonText: this.optText('ui.Reload', 'Reload'),
      yesButtonAction: () => {
        scout.reloadPage();
      },
      noButtonText: this.ready ? this.optText('ui.Ignore', 'Ignore') : null
    };
    this.showFatalMessage(boxOptions, jqXHR.status + '.net');
  }

  _processErrorJsonResponse(jsonError) {
    if (jsonError.code === Session.JsonResponseError.VERSION_MISMATCH) {
      let loopDetection = webstorage.getItemFromSessionStorage('scout:versionMismatch');
      if (!loopDetection) {
        webstorage.setItemToSessionStorage('scout:versionMismatch', 'yes');
        // Reload page -> everything should then be up to date
        scout.reloadPage();
        return;
      }
      webstorage.removeItemFromSessionStorage('scout:versionMismatch');
    }

    if (this.loggedOut) {
      // When the session is terminated via user request (logout button), the poller might return
      // with a code 20. If we are already logged out, there is no need to show a message box.
      return;
    }

    // Default values for fatal message boxes
    let boxOptions = {
      header: this.optText('ui.ServerError', 'Server error') + ' (' + this.optText('ui.ErrorCodeX', 'Code ' + jsonError.code, jsonError.code) + ')',
      body: jsonError.message,
      yesButtonText: this.optText('ui.Reload', 'Reload'),
      yesButtonAction: () => {
        scout.reloadPage();
      }
    };

    // Customize for specific error codes
    if (jsonError.code === Session.JsonResponseError.STARTUP_FAILED) {
      // there are no texts yet if session startup failed
      boxOptions.header = jsonError.message;
      boxOptions.body = null;
      boxOptions.yesButtonText = 'Retry';
    } else if (jsonError.code === Session.JsonResponseError.SESSION_TIMEOUT) {
      boxOptions.header = this.optText('ui.SessionTimeout', boxOptions.header);
      boxOptions.body = this.optText('ui.SessionExpiredMsg', boxOptions.body);
    } else if (jsonError.code === Session.JsonResponseError.UI_PROCESSING) {
      boxOptions.header = this.optText('ui.UnexpectedProblem', boxOptions.header);
      boxOptions.body = strings.join('\n\n',
        this.optText('ui.InternalProcessingErrorMsg', boxOptions.body, ' (' + this.optText('ui.ErrorCodeX', 'Code 20', '20') + ')'),
        this.optText('ui.UiInconsistentMsg', ''));
      boxOptions.noButtonText = this.optText('ui.Ignore', 'Ignore');
    } else if (jsonError.code === Session.JsonResponseError.UNSAFE_UPLOAD) {
      boxOptions.header = this.optText('ui.UnsafeUpload', boxOptions.header);
      boxOptions.body = this.optText('ui.UnsafeUploadMsg', boxOptions.body);
      boxOptions.yesButtonText = this.optText('ui.Ok', 'Ok');
      boxOptions.yesButtonAction = () => {
      };
    } else if (jsonError.code === Session.JsonResponseError.REJECTED_UPLOAD) {
      boxOptions.header = this.optText('ui.RejectedUpload', boxOptions.header);
      boxOptions.body = this.optText('ui.RejectedUploadMsg', boxOptions.body);
      boxOptions.yesButtonText = this.optText('ui.Ok', 'Ok');
      boxOptions.yesButtonAction = () => {
      };
    }
    this.showFatalMessage(boxOptions, jsonError.code);
  }

  _fireRequestFinished(message) {
    if (!this._deferred) {
      return;
    }
    if (message.events) {
      for (let i = 0; i < message.events.length; i++) {
        this._deferredEventTypes.push(message.events[i].type);
      }
    }
    if (this.requestsPendingCounter === 0) {
      this._deferred.resolve(this._deferredEventTypes);
      this._deferred = null;
      this._deferredEventTypes = null;
    }
  }

  /**
   * Shows a UI-only message box.
   *
   * @param options
   *          Options for the message box, see MessageBox
   * @param errorCode
   *          If defined, a second call to this method with the same errorCode will
   *          do nothing. Can be used to prevent double messages for the same error.
   */
  showFatalMessage(options, errorCode) {
    if (errorCode) {
      if (this._fatalMessagesOnScreen[errorCode]) {
        return;
      }
      this._fatalMessagesOnScreen[errorCode] = true;
    }
    this._setApplicationLoading(false);

    options = options || {};
    let model = {
        session: this,
        parent: this.desktop || new NullWidget(),
        iconId: options.iconId,
        severity: scout.nvl(options.severity, Status.Severity.ERROR),
        header: options.header,
        body: options.body,
        hiddenText: options.hiddenText,
        yesButtonText: options.yesButtonText,
        noButtonText: options.noButtonText,
        cancelButtonText: options.cancelButtonText
      },
      messageBox = scout.create('MessageBox', model),
      $entryPoint = options.entryPoint || this.$entryPoint;

    messageBox.on('action', event => {
      delete this._fatalMessagesOnScreen[errorCode];
      messageBox.destroy();
      let option = event.option;
      if (option === 'yes' && options.yesButtonAction) {
        options.yesButtonAction.apply(this);
      } else if (option === 'no' && options.noButtonAction) {
        options.noButtonAction.apply(this);
      } else if (option === 'cancel' && options.cancelButtonAction) {
        options.cancelButtonAction.apply(this);
      }
    });
    messageBox.render($entryPoint);
  }

  uploadFiles(target, files, uploadProperties, maxTotalSize, allowedTypes) {
    let formData = new FormData(),
      acceptedFiles = [];

    if (uploadProperties) {
      $.each(uploadProperties, (key, value) => {
        formData.append(key, value);
      });
    }

    $.each(files, (index, value) => {
      if (!allowedTypes || allowedTypes.length === 0 || scout.isOneOf(value.type, allowedTypes)) {
        /*
         * - see ClipboardField for comments on "scoutName"
         * - Some Browsers (e.g. Edge) handle an empty string as filename as if the filename is not set and therefore introduce a default filename like 'blob'.
         *   To counter this, we introduce a empty filename string. The string consists of characters that can not occur in regular filenames, to prevent collisions.
         */
        let filename = scout.nvl(value.scoutName, value.name, Session.EMPTY_UPLOAD_FILENAME);
        formData.append('files', value, filename);
        acceptedFiles.push(value);
      }
    });

    // 50 MB as default maximum size
    maxTotalSize = scout.nvl(maxTotalSize, FileInput.DEFAULT_MAXIMUM_UPLOAD_SIZE);

    // very large files must not be sent to server otherwise the whole system might crash (for all users).
    if (!fileUtil.validateMaximumUploadSize(acceptedFiles, maxTotalSize)) {
      let boxOptions = {
        header: this.text('ui.FileSizeLimitTitle'),
        body: this.text('ui.FileSizeLimit', maxTotalSize / 1024 / 1024),
        yesButtonText: this.optText('Ok', 'Ok')
      };

      this.showFatalMessage(boxOptions);
      return false;
    }

    let uploadAjaxOptions = {
      type: 'POST',
      url: 'upload/' + this.uiSessionId + '/' + target.id,
      cache: false,
      // Don't touch the data (do not convert it to string)
      processData: false,
      // Do not automatically add content type (otherwise, multipart boundary would be missing)
      contentType: false,
      data: formData
    };
    // Special handling for FormData polyfill
    if (formData.polyfill) {
      formData.applyToAjaxOptions(uploadAjaxOptions);
    }
    this.responseQueue.prepareHttpRequest(uploadAjaxOptions);

    let busyHandling = !this.areRequestsPending();
    this._performUserAjaxRequest(uploadAjaxOptions, busyHandling);
    return true;
  }

  goOffline() {
    if (this.offline) {
      return; // already offline
    }
    this.offline = true;

    // Abort pending ajax requests.
    this.abortAllAjaxCalls();

    // In Firefox, the current async polling request is interrupted immediately when the page is unloaded. Therefore,
    // an offline message would appear at once on the desktop. When reloading the page, all elements are cleared anyway,
    // thus we wait some short period of time before displaying the message and starting the reconnector. If
    // we find that goOffline() was called because of request unloading, we skip the unnecessary part. Note that
    // FF doesn't guarantee that _onWindowUnload() is called before this setTimeout() function is called. Therefore,
    // we have to look at another property "unloading" that is set earlier in _onWindowBeforeUnload().
    setTimeout(() => {
      if (this.unloading || this.unloaded) {
        return;
      }
      this.rootAdapter.goOffline();
      this.reconnector.start();
    }, 100);
  }

  goOnline() {
    this.offline = false;
    this.rootAdapter.goOnline();

    let request = this._newRequest({
      syncResponseQueue: true
    });
    this.responseQueue.prepareRequest(request);
    this._sendRequest(request); // implies "_resumeBackgroundJobPolling", and also sends queued request
  }

  onReconnecting() {
    if (this.desktop) {
      this.desktop.onReconnecting();
    }
  }

  onReconnectingSucceeded() {
    if (this.desktop) {
      this.desktop.onReconnectingSucceeded();
    }
    this.goOnline();
  }

  onReconnectingFailed() {
    if (this.desktop) {
      this.desktop.onReconnectingFailed();
    }
  }

  listen() {
    if (!this._deferred) {
      this._deferred = $.Deferred();
      this._deferredEventTypes = [];
    }
    return this._deferred;
  }

  /**
   * Executes the given callback when pending requests are finished, or immediately if there are no requests pending.
   * @param func callback function
   * @param vararg arguments to pass to the callback function
   */
  onRequestsDone(func, ...vararg) {
    if (this.areRequestsPending() || this.areEventsQueued()) {
      this.listen().done(onEventsProcessed);
    } else {
      func.apply(this, vararg);
    }

    function onEventsProcessed() {
      func.apply(this, vararg);
    }
  }

  /**
   * Executes the given callback when all events of the current response are processed. Executes it immediately if no events are being processed.
   * @param func callback function
   * @param vararg arguments to pass to the callback function
   */
  onEventsProcessed(func, ...vararg) {
    if (this.processingEvents) {
      this.one('eventsProcessed', execFunc);
    } else {
      execFunc();
    }

    function execFunc() {
      func.apply(this, vararg);
    }
  }

  areEventsQueued() {
    return this.asyncEvents.length > 0;
  }

  areBusyIndicatedEventsQueued() {
    return this.asyncEvents.some(event => {
      return scout.nvl(event.showBusyIndicator, true);
    });
  }

  areResponsesQueued() {
    return this.responseQueue.size() > 0;
  }

  areRequestsPending() {
    return this.requestsPendingCounter > 0;
  }

  setRequestPending(pending) {
    if (pending) {
      this.requestsPendingCounter++;
    } else {
      this.requestsPendingCounter--;
    }

    // In "inspector" mode, add/remove a marker attribute to the $entryPoint that
    // can be used to detect pending server calls by UI testing tools, e.g. Selenium
    if (this.inspector) {
      this.$entryPoint.toggleAttr('data-request-pending', pending, 'true');
    }
  }

  setBusy(busy) {
    if (busy) {
      if (!this._busy) {
        this._renderBusy();
      }
      this._busy = true;
    } else {
      if (this._busy) {
        this._removeBusy();
      }
      this._busy = false;
    }
  }

  _renderBusy() {
    if (this._busyIndicatorTimeoutId !== null && this._busyIndicatorTimeoutId !== undefined) {
      // Do not schedule it twice
      return;
    }
    // Don't show the busy indicator immediately. Set a short timer instead (which may be
    // cancelled again if the busy state returns to false in the meantime).
    this._busyIndicatorTimeoutId = setTimeout(() => {
      if (this._busyIndicator) {
        // busy indicator is already showing
        return;
      }
      if (!this.desktop || !this.desktop.rendered) {
        return; // No busy indicator without desktop (e.g. during shutdown)
      }
      this._busyIndicator = scout.create('BusyIndicator', {
        parent: this.desktop
      });
      this._busyIndicator.on('cancel', this._onCancelProcessing.bind(this));
      this._busyIndicator.render(this.$entryPoint);
    }, 500);
  }

  _removeBusy() {
    // Clear pending timer
    clearTimeout(this._busyIndicatorTimeoutId);
    this._busyIndicatorTimeoutId = null;

    // Remove busy indicator (if it was already created)
    if (this._busyIndicator) {
      this._busyIndicator.destroy();
      this._busyIndicator = null;
    }
  }

  _onCancelProcessing(event) {
    let busyIndicator = this._busyIndicator;
    if (!busyIndicator) {
      return; // removed in the mean time
    }
    busyIndicator.off('cancel');

    // Set "canceling" state in busy indicator (after 100ms, would not look good otherwise)
    setTimeout(() => {
      busyIndicator.cancelled();
    }, 100);

    this._sendCancelRequest();
  }

  _sendCancelRequest() {
    let request = this._newRequest({
      cancel: true,
      showBusyIndicator: false
    });
    this._sendRequest(request);
  }

  /**
   * Sends a request containing the error message for logging purpose.
   * The request is sent immediately (does not await pending requests)
   */
  sendLogRequest(message) {
    let request = this._newRequest({
      log: true,
      message: message
    });
    if (this.currentEvent) {
      request.event = {
        target: this.currentEvent.target,
        type: this.currentEvent.type
      };
    }

    // Do not use _sendRequest to make sure a log request has no side effects and will be sent only once
    $.ajax(this.defaultAjaxOptions(request));
  }

  _newRequest(requestData) {
    let request = $.extend({
      uiSessionId: this.uiSessionId
    }, requestData);

    // Certain requests do not require a sequence number
    if (!request.log && !request.syncResponseQueue) {
      request['#'] = this.requestSequenceNo++;
    }
    return request;
  }

  _setApplicationLoading(applicationLoading) {
    if (applicationLoading) {
      this._applicationLoadingTimeoutId = setTimeout(() => {
        if (!this.desktop || !this.desktop.rendered) {
          this._renderApplicationLoading();
        }
      }, 200);
    } else {
      clearTimeout(this._applicationLoadingTimeoutId);
      this._applicationLoadingTimeoutId = null;
      this._removeApplicationLoading();
    }
  }

  _renderApplicationLoading() {
    let $loadingRoot = $('body').appendDiv('application-loading-root')
      .addClass('application-loading-root')
      .fadeIn();
    // noinspection JSValidateTypes
    $loadingRoot.appendDiv('application-loading01').hide()
      .fadeIn();
    // noinspection JSValidateTypes
    $loadingRoot.appendDiv('application-loading02').hide()
      .fadeIn();
  }

  _removeApplicationLoading() {
    let $loadingRoot = $('body').children('.application-loading-root');
    $loadingRoot.addClass('application-loading-root-fadeout');
    if (Device.get().supportsCssAnimation()) {
      $loadingRoot.oneAnimationEnd(() => {
        $loadingRoot.remove();
      });
    } else {
      // fallback for old browsers that do not support the animation-end event
      $loadingRoot.remove();
    }
  }

  _processEvents(events) {
    let i = 0;
    while (i < events.length) {
      let event = events[i];
      this.currentEvent = event;

      let adapter = this.getModelAdapter(event.target);
      if (!adapter) {
        // Sometimes events seem to happen "too early", e.g. when a "requestFocus" event for a field is
        // encountered before the "showForm" event has been processed. If the target adapter cannot be
        // resolved, we try the other events first, expecting them to trigger the creation of the event
        // adapter. As soon as a event could be processed successfully, we try our postponed event again.
        $.log.isDebugEnabled() && $.log.debug('Postponing \'' + event.type + '\' for adapter with ID ' + event.target);
        i++;
        continue;
      }
      // Remove the successful event and reset the pointer to the start of the remaining events (to
      // retry previously postponed events).
      events.splice(i, 1);
      i = 0;

      $.log.isDebugEnabled() && $.log.debug('Processing event \'' + event.type + '\' for adapter with ID ' + event.target);
      adapter.onModelEvent(event);
      adapter.resetEventFilters();
    }
    this.currentEvent = null;

    // If there are still events whose target could not be resolved, throw an error
    if (events.length) {
      throw new Error('Could not resolve event targets: [' + events.map(event => {
        let msg = 'target: ' + event.target + ', type: ' + event.type;
        if (event.properties) {
          msg += ', properties: ' + Object.keys(event.properties);
        }
        return '"' + msg + '"';
      }, this).join(', ') + ']');
    }
    this.trigger('eventsProcessed');
  }

  start() {
    $.log.isInfoEnabled() && $.log.info('Session starting...');

    // After a short time, display a loading animation (will be removed again in _renderDesktop)
    this._setApplicationLoading(true);

    // Send startup request
    return this._sendStartupRequest();
  }

  onModelEvent(event) {
    if (event.type === 'localeChanged') {
      this._onLocaleChanged(event);
    } else if (event.type === 'logout') {
      this._onLogout(event);
    } else if (event.type === 'disposeAdapter') {
      this._onDisposeAdapter(event);
    } else if (event.type === 'reloadPage') {
      this._onReloadPage(event);
    } else {
      $.log.warn('Model action "' + event.type + '" is not supported by UI session');
    }
  }

  resetEventFilters() {
    // NOP
  }

  _onLocaleChanged(event) {
    let locale = new Locale(event.locale);
    let textMap = new TextMap(event.textMap);
    this.switchLocale(locale, textMap);
  }

  /**
   * @param {Locale} the new locale
   * @param {TextMap} [textMap] the new textMap. If not defined, the corresponding textMap for the new locale is used.
   */
  switchLocale(locale, textMap) {
    scout.assertParameter('locale', locale, Locale);
    this.locale = locale;
    this.textMap = texts.get(locale.languageTag);
    if (textMap) {
      objects.copyOwnProperties(textMap, this.textMap);
    }
    // TODO [7.0] bsh: inform components to reformat display text? also check Collator in comparators.TEXT

    this.trigger('localeSwitch', {
      locale: this.locale
    });
  }

  _renderDesktop() {
    this.desktop.render(this.$entryPoint);
    this.desktop.invalidateLayoutTree(false);
    this._setApplicationLoading(false);
  }

  _onLogout(event) {
    this.logout(event.redirectUrl);
  }

  logout(logoutUrl) {
    this.loggedOut = true;
    // TODO [7.0] bsh: Check if there is a better solution (e.g. send a flag from server "action" = [ "redirect" | "closeWindow" ])
    if (this.forceNewClientSession) {
      this.desktop.$container.window(true).close();
    } else {
      // remember current url to not lose query parameters (such as debug; however, ignore deeplinks)
      let url = new URL();
      url.removeParameter('dl'); // deeplink
      url.removeParameter('i'); // deeplink info
      webstorage.setItemToSessionStorage('scout:loginUrl', url.toString());
      // Clear everything and reload the page. We wrap that in setTimeout() to allow other events to be executed normally before.
      setTimeout(() => {
        scout.reloadPage({
          redirectUrl: logoutUrl
        });
      });
    }
  }

  _onDisposeAdapter(event) {
    // Model adapter was disposed on server -> dispose it on the UI, too
    let adapter = this.getModelAdapter(event.adapter);
    if (adapter) { // adapter may be null if it was never sent to the UI, e.g. a form that was opened and closed in the same request
      adapter.destroy();
    }
  }

  _onReloadPage(event) {
    // Don't clear the body, because other events might be processed before the reload and
    // it could cause errors when all DOM elements are already removed.
    scout.reloadPage({
      clearBody: false
    });
  }

  _onWindowBeforeUnload() {
    $.log.isInfoEnabled() && $.log.info('Session before unloading...');
    // TODO [7.0] bsh: Cancel pending requests

    // Set a flag that indicates unloading before _onWindowUnload() is called.
    // See goOffline() why this is necessary.
    this.unloading = true;
    setTimeout(() => {
      // Because there is no callback when the unloading was cancelled, we always
      // reset the flag after a short period of time.
      this.unloading = false;
    }, 200);
  }

  _onWindowUnload() {
    $.log.isInfoEnabled() && $.log.info('Session unloading...');
    this.unloaded = true;

    // Close popup windows
    if (this.desktop && this.desktop.formController) {
      this.desktop.formController.closePopupWindows();
    }

    // Destroy UI session on server (only when the server did not not initiate the logout,
    // otherwise the UI session would already be disposed)
    if (!this.loggedOut) {
      this._sendUnloadRequest();
    }
    if (this.loggedOut && this.persistent) {
      webstorage.removeItemFromLocalStorage('scout:clientSessionId');
    }
  }

  /**
   * Returns the adapter-data sent with the JSON response from the adapter-data cache. Note that this operation
   * removes the requested element from the cache, thus you cannot request the same ID twice. Typically once
   * you've requested an element from this cache an adapter for that ID is created and stored in the adapter
   * registry which too exists on this session object.
   */
  _getAdapterData(id) {
    let adapterData = this._adapterDataCache[id];
    let deleteAdapterData = !this.adapterExportEnabled;
    if (deleteAdapterData) {
      delete this._adapterDataCache[id];
    }
    return adapterData;
  }

  getAdapterData(id) {
    return this._adapterDataCache[id];
  }

  /**
   * Returns the text for the given key.
   *
   * @param textKey key to lookup the text
   * @param args texts to replace the placeholders specified by {0}, {1}, etc.
   * @returns {string}
   */
  text(textKey, ...args) {
    return this.textMap.get(textKey, ...args);
  }

  /**
   * Returns the text for the given key.
   *
   * @param textKey key to lookup the text
   * @param defaultValue the text to return if the key has not been found.
   * @param args texts to replace the placeholders specified by {0}, {1}, etc.
   * @returns {string}
   */
  optText(textKey, defaultValue, ...args) {
    return this.textMap.optGet(textKey, defaultValue, ...args);
  }

  textExists(textKey) {
    return this.textMap.exists(textKey);
  }

  // --- Event handling methods ---
  _createEventSupport() {
    return new EventSupport();
  }

  trigger(type, event) {
    event = event || {};
    event.source = this;
    this.events.trigger(type, event);
  }

  one(type, func) {
    this.events.one(type, func);
  }

  on(type, func) {
    return this.events.on(type, func);
  }

  off(type, func) {
    this.events.off(type, func);
  }

  addListener(listener) {
    this.events.addListener(listener);
  }

  removeListener(listener) {
    this.events.removeListener(listener);
  }

  when(type) {
    return this.events.when(type);
  }
}
