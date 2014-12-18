// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

/**
 * $entryPoint and jsonSessionId are required to create a new session. The 'options'
 * argument holds all optional values that may be used during initialization (it is
 * the same object passed to the scout.init() function).
 *
 * The following properties are read by this constructor function:
 *   [clientSessionId]
 *     Identifies the 'client instance' on the UI server. If the property is not set
 *     (which is the default case), the clientSessionId is taken from the browser's
 *     session storage (per browser window, survives F5 refresh of page). If no
 *     clientSessionId can be found, a new one is generated.
 *   [userAgent]
 *     Default: DESKTOP
 *   [objectFactories]
 *     Factories to build model adapters. Default: scout.defaultObjectFactories.
 */
scout.Session = function($entryPoint, jsonSessionId, options) {
  options = options || {};

  // Prepare clientSessionId
  var clientSessionId = options.clientSessionId;
  if (!clientSessionId) {
    clientSessionId = sessionStorage.getItem('scout:clientSessionId');
  }
  if (!clientSessionId) {
    clientSessionId = scout.numbers.toBase62(scout.dates.timestamp());
    sessionStorage.setItem('scout:clientSessionId', clientSessionId);
  }

  // Set members
  this.$entryPoint = $entryPoint;
  this.jsonSessionId = jsonSessionId;
  this.parentJsonSession;
  this.clientSessionId = clientSessionId;
  this.userAgent = options.userAgent || new scout.UserAgent(scout.UserAgent.DEVICE_TYPE_DESKTOP);
  this.modelAdapterRegistry = {};
  this.locale;
  this._asyncEvents = [];
  this._asyncRequestQueued;
  this._childWindows = []; // for detached windows
  this._deferred;
  this._startup;
  this._unload;
  this.desktop;
  this.url = 'json';
  this._adapterDataCache = {};
  this.objectFactory = new scout.ObjectFactory(this);
  this._textMap = {};
  this._customParams;
  this._requestsPendingCounter = 0; // TODO CGU do we really want to have multiple requests pending?
  this.layoutValidator = new scout.LayoutValidator();

  // TODO BSH Detach | Check if there is another way
  // If this is a popup window, re-register with parent (in case the user reloaded the popup window)
  if (window.opener && window.opener.scout && window.opener.scout.sessions) {
    // Should never happen, as forms are not detachable when multiple sessions are alive (see Form.js)
    if (window.opener.scout.sessions.length > 1) {
      window.close();
      throw new Error('Too many scout sessions');
    }
    var parentJsonSession = window.opener.scout.sessions[0];
    parentJsonSession.registerChildWindow(window);
    this.parentJsonSession = parentJsonSession; // TODO BSH Detach | Get from options instead?
  }

  this.modelAdapterRegistry[jsonSessionId] = this; // FIXME CGU maybe better separate session object from event processing, create ClientSession.js?. If yes, desktop should not have rootadapter as parent, see 406
  this.rootAdapter = new scout.ModelAdapter();
  this.rootAdapter.init({
    id: '1'
  }, this);
  this.objectFactory.register(options.objectFactories || scout.defaultObjectFactories);

  // Extract custom parameters from URL
  var customParamMap = new scout.URL().parameterMap;
  for (var prop in customParamMap) {
    this._customParams = this._customParams || {};
    this._customParams[prop] = customParamMap[prop];
  }
};

scout.Session.prototype.unregisterModelAdapter = function(modelAdapter) {
  delete this.modelAdapterRegistry[modelAdapter.id];
};

scout.Session.prototype.registerModelAdapter = function(modelAdapter) {
  if (modelAdapter.id === undefined) {
    throw new Error('modelAdapter.id must be defined');
  }
  this.modelAdapterRegistry[modelAdapter.id] = modelAdapter;
};

scout.Session.prototype.getModelAdapter = function(id) {
  return this.modelAdapterRegistry[id];
};

scout.Session.prototype.getOrCreateModelAdapter = function(id, parent) {
  if (!id) {
    return;
  }
  if (typeof id !== 'string') {
    throw new Error('typeof id must be string');
  }

  var adapter = this.modelAdapterRegistry[id];
  if (adapter) {
    return adapter;
  }

  var adapterData = this._getAdapterData(id);
  if (!adapterData) {
    throw new Error('no adapterData found for id=' + id);
  }

  if (!parent && adapterData.parent === undefined) {
    this._adapterDataCache[adapterData.id] = adapterData;
    throw new Error('parent must be defined');
  }
  // Prefer the parent sent by the server
  if (adapterData.parent !== undefined) {
    parent = this.getModelAdapter(adapterData.parent);
  }

  adapter = this.objectFactory.create(adapterData);
  adapter.parent = parent;
  parent.addChild(adapter);

  return adapter;
};

scout.Session.prototype.getOrCreateModelAdapters = function(ids, parent) {
  if (!ids) {
    return [];
  }
  var adapters = [];
  for (var i = 0; i < ids.length; i++) {
    adapters[i] = this.getOrCreateModelAdapter(ids[i], parent);
  }
  return adapters;
};

/**
 * Sends the request asynchronously and processes the response later.<br>
 * Furthermore, the request is sent delayed. If send is called multiple times
 * during the same user interaction, the events are collected and sent in one
 * request at the end of the user interaction
 */
scout.Session.prototype.send = function(type, id, data) {
  this._asyncEvents.push(new scout.Event(type, id, data));
  if (!this._asyncRequestQueued) {
    var that = this;
    setTimeout(function() {
      that._sendNow(that._asyncEvents);
      that._asyncRequestQueued = false;
      that._asyncEvents = [];
    }, 0);
    this._asyncRequestQueued = true;
  }
};

scout.Session.prototype._sendNow = function(events, deferred) {
  var request = {
    jsonSessionId: this.jsonSessionId,
    events: events
  };

  if (this._startup) {
    this._startup = false;
    // Build startup request (see JavaDoc for JsonStartupRequest.java for details)
    request.startup = true;
    request.clientSessionId = this.clientSessionId;
    if (this.parentJsonSession) {
      request.parentJsonSessionId = this.parentJsonSession.jsonSessionId;
    }
    if (this.userAgent.deviceType !== scout.UserAgent.DEVICE_TYPE_DESKTOP) {
      request.userAgent = this.userAgent;
    }
    request.customParams = this._customParams;
  }

  if (this._unload) {
    request.unload = true;
  }

  this._sendRequest(request);
};

scout.Session.prototype._sendRequest = function(request) {
  if (this.offline) {
    this._queuedRequest.events = this._queuedRequest.events.concat(request.events);
    return;
  }

  var that = this;
  this._requestsPendingCounter++;
  $.ajax({
    async: true,
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=UTF-8',
    cache: false,
    url: this.url,
    data: JSON.stringify(request),
    context: request
  }).done(function(data) {
    that._processSuccessResponse(data);
  }).fail(function(jqXHR, textStatus, errorThrown) {
    var request = this;
    that._processErrorResponse(request, jqXHR, textStatus, errorThrown);
  });
};

scout.Session.prototype._processSuccessResponse = function(message) {
  var cacheSize;
  // Normalize
  if (message.adapterData === undefined) {
    message.adapterData = {};
  }
  if (message.events === undefined) {
    message.events = {};
  }

  this._queuedRequest = null;
  this._requestsPendingCounter--;

  this._copyAdapterData(message.adapterData);
  this.processingEvents = true;
  try {
    this._processEvents(message.events);
    this.layoutValidator.validate();
  } finally {
    this.processingEvents = false;
  }

  if ($.log.isDebugEnabled()) {
    cacheSize = scout.objects.countProperties(this._adapterDataCache);
    $.log.debug('size of _adapterDataCache after response has been processed: ' + cacheSize);
    cacheSize = scout.objects.countProperties(this.modelAdapterRegistry);
    $.log.debug('size of modelAdapterRegistry after response has been processed: ' + cacheSize);
  }

  if (this._deferred) {
    for (var i = 0; i < message.events.length; i++) {
      this._deferredEventTypes.push(message.events[i].type);
    }

    if (this._requestsPendingCounter === 0) {
      this._deferred.resolve(this._deferredEventTypes);
      this._deferred = null;
      this._deferredEventTypes = null;
    }
  }
};

scout.Session.prototype._copyAdapterData = function(adapterData) {
  var count = 0;
  var prop;
  for (prop in adapterData) {
    this._adapterDataCache[prop] = adapterData[prop];
    count++;
  }
  if (count > 0) {
    $.log.debug('Stored ' + count + ' properties in adapterDataCache');
  }
};

/**
 * @param textStatus 'timeout', 'abort', 'error' or 'parseerror' (see http://api.jquery.com/jquery.ajax/)
 */
scout.Session.prototype._processErrorResponse = function(request, jqXHR, textStatus, errorThrown) {
  $.log.error('errorResponse: status=' + jqXHR.status + ', textStatus=' + textStatus + ', errorThrown=' + errorThrown);
  this._requestsPendingCounter--;

  //Status code = 0 -> no connection
  //Status code >= 12000 come from windows, see http://msdn.microsoft.com/en-us/library/aa383770%28VS.85%29.aspx. Not sure if it is necessary for IE >= 9.
  if (!jqXHR.status || jqXHR.status >= 12000) {
    this.goOffline();
    if (!this._queuedRequest) {
      this._queuedRequest = request;
    }
    return;
  }

  var jsonResponse = jqXHR.responseJSON;
  if (jsonResponse && jsonResponse.errorMessage) {
    if (this.desktop) {
      var buttonName, buttonAction,
        title = this.text('ServerError'),
        text = jsonResponse.errorMessage;
      if (jsonResponse.errorCode === 10) { // JsonResponse.ERR_SESSION_TIMEOUT
        title = this.optText('SessionTimeout', title);
        text = this.optText('SessionExpiredMsg', text);
        buttonName = this.text('Reload');
        buttonAction = function() {
          // Hide everything
          this.session.$entryPoint.html('');
          // Reload window (using setTimeout, to overcome drawing issues in IE)
          setTimeout(function() {
            window.location.reload();
          });
        };
      }
      this.desktop.showFatalMessage(title, text, buttonName, buttonAction);
    } else {
      this.$entryPoint.html('');
      this.$entryPoint.text(jsonResponse.errorMessage);
    }
    return;
  }

  if (errorThrown) {
    throw errorThrown;
  }
  throw new Error('Error while processing request. ' + textStatus);
};

scout.Session.prototype.goOffline = function() {
  this.offline = true;
  this.desktop.goOffline();

  if (!this.reconnector) {
    this.reconnector = new scout.Reconnector(this);
  }
  this.reconnector.start();
};

scout.Session.prototype.goOnline = function() {
  this.offline = false;
  this._sendRequest(this._queuedRequest);
  this.desktop.goOnline();
};

scout.Session.prototype.onReconnecting = function() {
  this.desktop.onReconnecting();
};

scout.Session.prototype.onReconnectingSucceeded = function() {
  this.desktop.onReconnectingSucceeded();
  this.goOnline();
};

scout.Session.prototype.onReconnectingFailed = function() {
  this.desktop.onReconnectingFailed();
};

scout.Session.prototype.listen = function() {
  if (!this._deferred) {
    this._deferred = $.Deferred();
    this._deferredEventTypes = [];
  }
  return this._deferred;
};

scout.Session.prototype.areEventsQueued = function() {
  return this._asyncEvents.length > 0;
};

scout.Session.prototype.areRequestsPending = function() {
  return this._requestsPendingCounter > 0;
};

scout.Session.prototype._processEvents = function(events) {
  var i, event, adapter;
  for (i = 0; i < events.length; i++) {
    event = events[i];
    $.log.debug("Processing event '" + event.type + "' for adapter with ID " + event.id);
    adapter = this.getOrCreateModelAdapter(event.id, scout.rootAdapter);
    if (!adapter) {
      throw new Error('No adapter registered for ID ' + event.id);
    }
    if ('property' === event.type) { // Special handling for 'property' type
      adapter.onModelPropertyChange(event);
    } else {
      adapter.onModelAction(event);
    }
  }
};

scout.Session.prototype.init = function() {
  this._startup = true;
  this._sendNow();

  // Ask if child windows should be closed as well
  $(window).on('beforeunload', function() {
    if (this._childWindows.length > 0) {
      return 'There are windows in DETACHED state.'; // TODO BSH Detach | Text
    }
  }.bind(this));

  // Destroy json session on server when page is closed or reloaded
  $(window).on('unload', function() {
    // Destroy JSON session on server
    this._unload = true;
    this._sendNow();
    // If child windows are open, they have to be closed as well
    this._childWindows.forEach(function(childWindow) {
      childWindow.close();
    });
  }.bind(this));
};

scout.Session.prototype.onModelAction = function(event) {
  if (event.type === 'localeChanged') {
    this.locale = new scout.Locale(event);
    // FIXME inform components to reformat display text?
  } else if (event.type === 'initialized') {
    this._textMap = event.textMap;
    var clientSessionData = this._getAdapterData(event.clientSession);
    this.locale = new scout.Locale(clientSessionData.locale);
    this.desktop = this.getOrCreateModelAdapter(clientSessionData.desktop, this.rootAdapter);
    this.desktop.render(this.$entryPoint);
  }
};

/**
 * Returns the adapter-data sent with the JSON response from the adapter-data cache. Note that this operation
 * removes the requested element from the cache, thus you cannot request the same ID twice. Typically once
 * you've requested an element from this cache an adapter for that ID is created and stored in the adapter
 * registry which too exists on this session object.
 */
scout.Session.prototype._getAdapterData = function(id) {
  var adapterData = this._adapterDataCache[id];
  delete this._adapterDataCache[id];
  return adapterData;
};

scout.Session.prototype.registerChildWindow = function(childWindow) {
  if (!childWindow) {
    throw new Error("Missing argument 'childWindow'");
  }

  // Add to list of open child windows
  this._childWindows.push(childWindow);

  // When the child window is closed, remove it again from the list
  $(childWindow).on('unload', function() {
    var i = this._childWindows.indexOf(childWindow);
    if (i > -1) {
      this._childWindows.splice(i, 1);
    }
  }.bind(this));
};

scout.Session.prototype.text = function(textKey) {
  if (this.textExists(textKey)) {
    var len = arguments.length,
      text = this._textMap[textKey];
    if (len === 1) {
      return text;
    } else {
      var i, placeholder;
      for (i = 1; i < len; i++) {
        placeholder = '{' + (i - 1) + '}';
        text = text.replace(placeholder, arguments[i]);
      }
      return text;
    }
  } else {
    return '[undefined text: ' + textKey + ']';
  }
};

scout.Session.prototype.optText = function(textKey, defaultValue) {
  if (!this.textExists(textKey)) {
    return defaultValue;
  }
  if (arguments.length > 2) {
    // dynamically call text() without 'defaultValue' argument
    var args = Array.prototype.slice.call(arguments, 2);
    args.unshift(textKey); // add textKey as first argument
    return scout.Session.prototype.text.apply(this, args);
  }
  return this.text(textKey);
};

scout.Session.prototype.textExists = function(textKey) {
  return this._textMap.hasOwnProperty(textKey);
};
