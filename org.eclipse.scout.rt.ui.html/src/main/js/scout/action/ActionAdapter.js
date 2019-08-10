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
scout.ActionAdapter = function() {
  scout.ActionAdapter.parent.call(this);
  this._addRemoteProperties(['selected']);
};
scout.inherits(scout.ActionAdapter, scout.ModelAdapter);

scout.ActionAdapter.prototype._goOffline = function() {
  this._enabledBeforeOffline = this.widget.enabled;
  this.widget.setEnabled(false);
};

scout.ActionAdapter.prototype._goOnline = function() {
  this.widget.setEnabled(this._enabledBeforeOffline);
};

scout.ActionAdapter.prototype._onWidgetAction = function(event) {
  if (this.widget.isToggleAction()) {
    return;
  }
  this._send('action');
};

scout.ActionAdapter.prototype._onWidgetEvent = function(event) {
  if (event.type === 'action') {
    this._onWidgetAction(event);
  } else {
    scout.ActionAdapter.parent.prototype._onWidgetEvent.call(this, event);
  }
};
