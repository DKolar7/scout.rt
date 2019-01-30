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
scout.FileChooserField = function() {
  scout.FileChooserField.parent.call(this);

  this.acceptTypes = null;
  this.maximumUploadSize = scout.FileInput.DEFAULT_MAXIMUM_UPLOAD_SIZE;
};
scout.inherits(scout.FileChooserField, scout.ValueField);

scout.FileChooserField.prototype._init = function(model) {
  scout.FileChooserField.parent.prototype._init.call(this, model);

  this.fileInput.on('change', this._onFileChange.bind(this));
  this.on('propertyChange', function(event) {
    if (event.propertyName === 'enabledComputed') {
      // Propagate "enabledComputed" to inner widget
      this.fileInput.setEnabled(event.newValue);
    }
  }.bind(this));
};

/**
 * Initializes the file input before calling set value.
 * This cannot be done in _init because the value field would call _setValue first
 */
scout.FileChooserField.prototype._initValue = function(value) {
  this.fileInput = scout.create('FileInput', {
    parent: this,
    acceptTypes: this.acceptTypes,
    text: this.displayText,
    enabled: this.enabledComputed,
    maximumUploadSize: this.maximumUploadSize
  });

  scout.FileChooserField.parent.prototype._initValue.call(this, value);
};

scout.FileChooserField.prototype._initKeyStrokeContext = function() {
  scout.FileChooserField.parent.prototype._initKeyStrokeContext.call(this);
  if (!this.fileInput.legacy) {
    this.keyStrokeContext.registerKeyStroke(new scout.FileChooserFieldBrowseKeyStroke(this));
    this.keyStrokeContext.registerKeyStroke(new scout.FileChooserFieldDeleteKeyStroke(this));
  }
};

scout.FileChooserField.prototype._render = function() {
  this.addContainer(this.$parent, 'file-chooser-field has-icon');
  this.addLabel();
  this.addMandatoryIndicator();
  this._renderFileInput();
  this.addIcon();
  this.addStatus();
};

scout.FileChooserField.prototype._renderFileInput = function() {
  this.fileInput.render();
  this.addField(this.fileInput.$container);
};

scout.FileChooserField.prototype.setDisplayText = function(text) {
  scout.FileChooserField.parent.prototype.setDisplayText.call(this, text);
  this.fileInput.setText(text);
  if (!text) {
    this.fileInput.clear();
  }
};

/**
 * @override
 */
scout.FileChooserField.prototype._readDisplayText = function() {
  return this.fileInput.text;
};

scout.FileChooserField.prototype.setAcceptTypes = function(acceptTypes) {
  this.setProperty('acceptTypes', acceptTypes);
  this.fileInput.setAcceptTypes(acceptTypes);
};

scout.FileChooserField.prototype._renderEnabled = function() {
  scout.FileChooserField.parent.prototype._renderEnabled.call(this);
  this.$field.setTabbable(this.enabledComputed);
};

scout.FileChooserField.prototype._renderPlaceholder = function() {
  var $field = this.fileInput.$text;
  if ($field) {
    $field.placeholder(this.label);
  }
};

scout.FileChooserField.prototype._removePlaceholder = function() {
  var $field = this.fileInput.$text;
  if ($field) {
    $field.placeholder('');
  }
};

scout.FileChooserField.prototype.setMaximumUploadSize = function(maximumUploadSize) {
  this.setProperty('maximumUploadSize', maximumUploadSize);
  this.fileInput.setMaximumUploadSize(maximumUploadSize);
};

scout.FileChooserField.prototype._clear = function() {
  this.fileInput.clear();
};

scout.FileChooserField.prototype._onIconMouseDown = function(event) {
  scout.FileChooserField.parent.prototype._onIconMouseDown.call(this, event);
  this.activate();
};

scout.FileChooserField.prototype._onFileChange = function(event) {
  var file = scout.arrays.first(event.files);
  if (scout.objects.isNullOrUndefined(file)) {
    this.acceptInput(false);
  }
  this.setValue(file);
};

/**
 * @override
 */
scout.FileChooserField.prototype.activate = function() {
  if (!this.enabledComputed || !this.rendered) {
    return;
  }
  this.$field.focus();
  this.fileInput.browse();
};

/**
 * @override
 */
scout.FileChooserField.prototype._validateValue = function(value) {
  this.fileInput.validateMaximumUploadSize(value);
  return value;
};

/**
 * @override
 */
scout.FileChooserField.prototype._formatValue = function(value) {
  return !value ? '' : value.name;
};
