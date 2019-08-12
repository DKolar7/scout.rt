/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
scout.TextColumnUserFilter = function() {
  scout.TextColumnUserFilter.parent.call(this);

  this.freeText = null;
  this.freeTextField = null;
  this.hasFilterFields = true;
};
scout.inherits(scout.TextColumnUserFilter, scout.ColumnUserFilter);

/**
 * @override ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.createFilterAddedEventData = function() {
  var data = scout.TextColumnUserFilter.parent.prototype.createFilterAddedEventData.call(this);
  data.freeText = this.freeText;
  return data;
};

/**
 * @override ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.fieldsFilterActive = function() {
  return scout.strings.hasText(this.freeText);
};

/**
 * @override ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.acceptByFields = function(key, normKey, row) {
  var filterFieldText = scout.strings.nvl(this.freeText).toLowerCase(),
    rowText = scout.strings.nvl(this.column.cellTextForTextFilter(row)).toLowerCase();
  return rowText.indexOf(filterFieldText) > -1;
};

/**
 * @implements ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype._useTextInsteadOfNormValue = function(value) {
  // null is valid, if for text columns. We do not want to store -empty-
  return value === null ? false : true;
};

/**
 * @implements ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.filterFieldsTitle = function() {
  return this.session.text('ui.FreeText');
};

/**
 * @override ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.addFilterFields = function(groupBox) {
  this.freeTextField = scout.create('StringField', {
    parent: groupBox,
    labelVisible: false,
    statusVisible: false,
    maxLength: 100,
    displayText: this.freeText,
    updateDisplayTextOnModify: true
  });
  this.freeTextField.on('acceptInput', this._onAcceptInput.bind(this));
  groupBox.addField0(this.freeTextField);
};

scout.TextColumnUserFilter.prototype._onAcceptInput = function(event) {
  this.freeText = this.freeTextField.$field.val().trim();
  $.log.isDebugEnabled() && $.log.debug('(TextColumnUserFilter#_onAcceptInput) freeText=' + this.freeText);
  this.triggerFilterFieldsChanged(event);
};

/**
 * @override ColumnUserFilter.js
 */
scout.TextColumnUserFilter.prototype.modifyFilterFields = function() {
  this.freeTextField.removeMandatoryIndicator();
};
