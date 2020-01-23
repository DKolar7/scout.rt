/*******************************************************************************
 * Copyright (c) 2014-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.DesktopAdapter = function() {
  scout.DesktopAdapter.parent.call(this);
  this._addRemoteProperties(['benchVisible', 'navigationVisible', 'navigationHandleVisible', 'headerVisible', 'geolocationServiceAvailable', 'inBackground']);
};
scout.inherits(scout.DesktopAdapter, scout.ModelAdapter);

scout.DesktopAdapter.prototype._goOffline = function() {
  this.widget.goOffline();
};

scout.DesktopAdapter.prototype._goOnline = function() {
  this.widget.goOnline();
};

scout.DesktopAdapter.prototype._onWidgetHistoryEntryActivate = function(event) {
  this._send('historyEntryActivate', {
    deepLinkPath: event.deepLinkPath
  });
};

scout.DesktopAdapter.prototype._onWidgetFormActivate = function(event) {
  if (event.form && !event.form.modelAdapter) {
    return; // Ignore ScoutJS forms
  }
  this._sendFormActivate(event.form);
};

scout.DesktopAdapter.prototype._sendFormActivate = function(form) {
  var eventData = {
    formId: form ? form.modelAdapter.id : null
  };

  this._send('formActivate', eventData, {
    coalesce: function(previous) {
      // Do not coalesce if formId was set to null by the previous event,
      // this is the only way the server knows that the desktop was brought to front
      return this.target === previous.target && this.type === previous.type &&
        !(previous.formId === null && this.formId !== null);
    }
  });
};

scout.DesktopAdapter.prototype._logoAction = function(event) {
  this._send('logoAction');
};

scout.DesktopAdapter.prototype._onWidgetEvent = function(event) {
  if (event.type === 'formActivate') {
    this._onWidgetFormActivate(event);
  } else if (event.type === 'historyEntryActivate') {
    this._onWidgetHistoryEntryActivate(event);
  } else if (event.type === 'logoAction') {
    this._logoAction(event);
  } else if (event.type === 'cancelForms') {
    this._onWidgetCancelAllForms(event);
  } else {
    scout.DesktopAdapter.parent.prototype._onWidgetEvent.call(this, event);
  }
};

scout.DesktopAdapter.prototype._onFormShow = function(event) {
  var form,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    form = this.session.getOrCreateWidget(event.form, displayParent.widget);
    form.setDisplayParent(displayParent.widget);

    var hasPendingFormActivateEvent = this.session.asyncEvents.some(function(event) {
      return event.type === 'formActivate' && event.target === this.id;
    }, this);
    if (!hasPendingFormActivateEvent) {
      this.addFilterForWidgetEvent(function(widgetEvent) {
        return (widgetEvent.type === 'formActivate' && widgetEvent.form === form);
      }.bind(this));
    }

    this.widget.showForm(form, event.position);
  }
};

scout.DesktopAdapter.prototype._onFormHide = function(event) {
  var form,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    form = this.session.getModelAdapter(event.form);
    this.widget.hideForm(form.widget);
  }
};

scout.DesktopAdapter.prototype._onFormActivate = function(event) {
  var form = this.session.getWidget(event.form);
  this.widget.activateForm(form);
};

scout.DesktopAdapter.prototype._onWidgetCancelAllForms = function(event) {
  event.preventDefault();
  var formIds = [];
  if (event.forms) {
    formIds = event.forms.map(function(form) {
      return form.modelAdapter.id;
    });
  }
  this._send('cancelForms', {
    formIds: formIds
  });
};

scout.DesktopAdapter.prototype._onMessageBoxShow = function(event) {
  var messageBox,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    messageBox = this.session.getOrCreateWidget(event.messageBox, displayParent.widget);
    messageBox.setDisplayParent(displayParent.widget);
    displayParent.widget.messageBoxController.registerAndRender(messageBox);
  }
};

scout.DesktopAdapter.prototype._onMessageBoxHide = function(event) {
  var messageBox,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    messageBox = this.session.getModelAdapter(event.messageBox);
    displayParent.widget.messageBoxController.unregisterAndRemove(messageBox.widget);
  }
};

scout.DesktopAdapter.prototype._onFileChooserShow = function(event) {
  var fileChooser,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    fileChooser = this.session.getOrCreateWidget(event.fileChooser, displayParent.widget);
    fileChooser.setDisplayParent(displayParent.widget);
    displayParent.widget.fileChooserController.registerAndRender(fileChooser);
  }
};

scout.DesktopAdapter.prototype._onFileChooserHide = function(event) {
  var fileChooser,
    displayParent = this.session.getModelAdapter(event.displayParent);

  if (displayParent) {
    fileChooser = this.session.getModelAdapter(event.fileChooser);
    displayParent.widget.fileChooserController.unregisterAndRemove(fileChooser.widget);
  }
};

scout.DesktopAdapter.prototype._onOpenUri = function(event) {
  this.widget.openUri(event.uri, event.action);
};

scout.DesktopAdapter.prototype._onOutlineChanged = function(event) {
  var outline = this.session.getOrCreateWidget(event.outline, this.widget);
  this.widget.setOutline(outline);
};

scout.DesktopAdapter.prototype._onAddNotification = function(event) {
  var notification = this.session.getOrCreateWidget(event.notification, this.widget);
  this.widget.addNotification(notification);
};

scout.DesktopAdapter.prototype._onRemoveNotification = function(event) {
  this.widget.removeNotification(event.notification);
};

scout.DesktopAdapter.prototype._onOutlineContentActivate = function(event) {
  this.widget.bringOutlineToFront();
};

scout.DesktopAdapter.prototype._onRequestGeolocation = function(event) {
  if (navigator.geolocation) {
    var success = function(position) {
      this._send('geolocationDetermined', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    }.bind(this);
    var error = function(error) {
      this._send('geolocationDetermined', {
        errorCode: error.code,
        errorMessage: error.message
      });
    }.bind(this);
    navigator.geolocation.getCurrentPosition(success, error);
  }
};

scout.DesktopAdapter.prototype.onModelAction = function(event) {
  if (event.type === 'formShow') {
    this._onFormShow(event);
  } else if (event.type === 'formHide') {
    this._onFormHide(event);
  } else if (event.type === 'formActivate') {
    this._onFormActivate(event);
  } else if (event.type === 'messageBoxShow') {
    this._onMessageBoxShow(event);
  } else if (event.type === 'messageBoxHide') {
    this._onMessageBoxHide(event);
  } else if (event.type === 'fileChooserShow') {
    this._onFileChooserShow(event);
  } else if (event.type === 'fileChooserHide') {
    this._onFileChooserHide(event);
  } else if (event.type === 'openUri') {
    this._onOpenUri(event);
  } else if (event.type === 'outlineChanged') {
    this._onOutlineChanged(event);
  } else if (event.type === 'outlineContentActivate') {
    this._onOutlineContentActivate(event);
  } else if (event.type === 'addNotification') {
    this._onAddNotification(event);
  } else if (event.type === 'removeNotification') {
    this._onRemoveNotification(event);
  } else if (event.type === 'requestGeolocation') {
    this._onRequestGeolocation(event);
  } else {
    scout.DesktopAdapter.parent.prototype.onModelAction.call(this, event);
  }
};
