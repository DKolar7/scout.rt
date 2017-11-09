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
scout.ContentEditorField = function() {
  scout.ContentEditorField.parent.call(this);

  this.contentEditor = null;
};
scout.inherits(scout.ContentEditorField, scout.FormField);

scout.ContentEditorField.prototype._init = function(model) {
  scout.ContentEditorField.parent.prototype._init.call(this, model);

  this.contentEditor = scout.create('ContentEditor', {
    parent: this,
    content: model.content,
    dropzoneLabel: model.dropzoneLabel
  });

  this.contentEditor.on('propertyChange', this._onPropertyChange.bind(this));
  this.contentEditor.on('editElement', this._onEditElement.bind(this));
};

scout.ContentEditorField.prototype._render = function() {
  this.addContainer(this.$parent, 'ce-field');
  this.addLabel();
  this.addMandatoryIndicator();
  this._renderContentEditor();
  this.addStatus();
};

scout.ContentEditorField.prototype._renderContentEditor = function() {
  this.contentEditor.render();
  this.addField(this.contentEditor.$container);
};

scout.ContentEditorField.prototype.setContent = function(content) {
  this.setProperty('content', content);
  this.contentEditor.setContent(content);
};

scout.ContentEditorField.prototype.setDropzoneLabel = function(dropzoneLabel) {
  this.setProperty('dropzoneLabel', dropzoneLabel);
  this.contentEditor.setDropzoneLabel(dropzoneLabel);
};

scout.ContentEditorField.prototype._onPropertyChange = function(event) {
  if (event.propertyName === 'content') {
    this._setProperty('content', this.contentEditor.content);
  }
};

scout.ContentEditorField.prototype._onEditElement = function(event) {
  this.trigger('editElement', event);
};

scout.ContentEditorField.prototype.updateElement = function(elementContent, slot, elementId) {
  this.contentEditor.updateElement(elementContent, slot, elementId);
};
