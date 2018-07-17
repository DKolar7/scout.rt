/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.TouchPopup = function() {
  scout.TouchPopup.parent.call(this);

  // the original touch field from the form
  this._touchField;
  // the cloned field from the popup
  this._field;
  // the widget placed below the field
  this._widget;
  this._$widgetContainer;
  this._widgetContainerHtmlComp;
  this.windowPaddingX = 0;
  this.windowPaddingY = 0;
  this.withGlassPane = true;
  this._touchFieldPropertyChangeListener = this._onTouchFieldPropertyChange.bind(this);
};
scout.inherits(scout.TouchPopup, scout.Popup);

scout.TouchPopup.prototype._init = function(options) {
  scout.TouchPopup.parent.prototype._init.call(this, options);
  this._touchField = options.field;

  // clone original touch field
  // original and clone both point to the same popup instance
  this._field = this._touchField.clone(this._fieldOverrides());
  this._touchField.on('propertyChange', this._touchFieldPropertyChangeListener);
  this._initWidget(options);
};

scout.TouchPopup.prototype._destroy = function() {
  this._touchField.off('propertyChange', this._touchFieldPropertyChangeListener);
  scout.TouchPopup.parent.prototype._destroy.call(this);
};

scout.TouchPopup.prototype._fieldOverrides = function() {
  return {
    parent: this,
    labelPosition: scout.FormField.LabelPosition.ON_FIELD,
    fieldStyle: scout.FormField.FieldStyle.CLASSIC,
    popup: this,
    statusVisible: false,
    embedded: true,
    touchMode: false,
    clearable: scout.ValueField.Clearable.ALWAYS
  };
};

scout.TouchPopup.prototype._initWidget = function(options) {
  // NOP
};

scout.TouchPopup.prototype._createLayout = function() {
  return new scout.TouchPopupLayout(this);
};

/**
 * @override Popup.js
 */
scout.TouchPopup.prototype.prefLocation = function(openingDirectionY) {
  var popupSize = this.htmlComp.prefSize(),
    windowWidth = this.$container.window().width(),
    x = Math.max(this.windowPaddingX, (windowWidth - popupSize.width) / 2);
  return new scout.Point(x, 0);
};

scout.TouchPopup.prototype._render = function() {
  this.$container = this.$parent.appendDiv('touch-popup');

  this._$header = this.$container.appendDiv('touch-popup-header');
  this._$header
    .appendDiv('status closer touch-popup-close-icon')
    .on('click', this._onCloseIconClick.bind(this));
  this._$header.appendDiv('touch-popup-title').textOrNbsp(this._touchField.label, 'empty');

  this._$widgetContainer = this.$container.appendDiv('touch-popup-widget-container');
  this._widgetContainerHtmlComp = scout.HtmlComponent.install(this._$widgetContainer, this.session);
  this._widgetContainerHtmlComp.setLayout(new scout.SingleLayout());

  // field may render something into the widget container -> render after widget container and move to correct place
  this._field.render();

  // Move to top
  this._field.$container.insertBefore(this._$widgetContainer);
  this._field.$container.addClass('touch-popup-field');

  if (this._widget) {
    this._widget.render(this._$widgetContainer);
  }

  this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
  this.htmlComp.validateRoot = true;
  this.htmlComp.setLayout(this._createLayout());
};

scout.TouchPopup.prototype._onTouchFieldPropertyChange = function(event) {
  if (event.propertyName === 'errorStatus') {
    this._field.setErrorStatus(event.newValue);
  } else if (event.propertyName === 'lookupRow') {
    this._field.setLookupRow(event.newValue);
  }
};

/**
 * Calls accept input on the embedded field.
 */
scout.TouchPopup.prototype._acceptInput = function() {
  var promise = this._field.acceptInput();
  if (promise) {
    promise.always(this.close.bind(this));
  } else {
    this.close();
  }
};

scout.TouchPopup.prototype._onCloseIconClick = function(event) {
  this._acceptInput();
};
