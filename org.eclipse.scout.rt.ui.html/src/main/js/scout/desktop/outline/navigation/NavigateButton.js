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
/**
 * The outline navigation works mostly browser-side. The navigation logic is implemented in JavaScript.
 * When a navigation button is clicked, we process that click browser-side first and send an event to
 * the server which nodes have been selected. We do that for better user experience. In a first attempt
 * the whole navigation logic was on the server, which caused a lag and flickering in the UI.
 *
 * @abstract
 */
scout.NavigateButton = function() {
  scout.NavigateButton.parent.call(this);

  this.node = null;
  this.outline = null;
  this.actionStyle = scout.Action.ActionStyle.BUTTON;
  /**
   * Additional CSS class to be applied in _render method.
   */
  this._additionalCssClass = '';
  this._addCloneProperties(['node', 'outline', 'altKeyStrokeContext']);
  this.inheritAccessibility = false;
};
scout.inherits(scout.NavigateButton, scout.Menu);

/**
 * @override
 */
scout.NavigateButton.prototype._render = function() {
  if (this.overflow) {
    this.text = this.session.text(this._defaultText);
    this.iconId = null;
  } else {
    this.text = null;
    this.iconId = this._defaultIconId;
  }
  this.updateEnabled();
  scout.NavigateButton.parent.prototype._render.call(this);
  this.$container.addClass('navigate-button small');
  this.$container.addClass(this._additionalCssClass);
  this.altKeyStrokeContext.registerKeyStroke(this);
};

/**
 * @override Action.js
 */
scout.NavigateButton.prototype._remove = function() {
  scout.NavigateButton.parent.prototype._remove.call(this);
  this.altKeyStrokeContext.unregisterKeyStroke(this);
};

scout.NavigateButton.prototype._setDetailVisible = function() {
  var detailVisible = this._toggleDetail();
  $.log.isDebugEnabled() && $.log.debug('show detail-' + (detailVisible ? 'form' : 'table'));
  this.outline.setDetailFormVisibleByUi(this.node, detailVisible);
};

/**
 * @override Menu.js
 */
scout.NavigateButton.prototype._doAction = function() {
  scout.NavigateButton.parent.prototype._doAction.call(this);
  if (this._isDetail()) {
    this._setDetailVisible();
  } else {
    this._drill();
  }
};

/**
 * Called when enabled state must be re-calculated and probably rendered.
 */
scout.NavigateButton.prototype.updateEnabled = function() {
  this.setEnabled(this._buttonEnabled());
};
