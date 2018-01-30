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
scout.WrappedFormField = function() {
  scout.WrappedFormField.parent.call(this);
  this._addWidgetProperties(['innerForm']);
  this.innerForm = null;
  this.initialFocusEnabled = false;

  this._formDestroyHandler = this._onInnerFormDestroy.bind(this);
};
scout.inherits(scout.WrappedFormField, scout.FormField);

scout.WrappedFormField.prototype._init = function(model) {
  scout.WrappedFormField.parent.prototype._init.call(this, model);
  this._setInnerForm(this.innerForm);
};

scout.WrappedFormField.prototype._render = function() {
  this.addContainer(this.$parent, 'wrapped-form-field');
  this.addLabel();
  this.addStatus();
};

scout.WrappedFormField.prototype._renderProperties = function() {
  scout.WrappedFormField.parent.prototype._renderProperties.call(this);
  this._renderInnerForm();
};

scout.WrappedFormField.prototype.setInnerForm = function(innerForm) {
  this.setProperty('innerForm', innerForm);
};

scout.WrappedFormField.prototype._setInnerForm = function(innerForm) {
  if (this.innerForm) {
    this.innerForm.off('destroy', this._formDestroyHandler);
  }
  if (innerForm) {
    innerForm.on('destroy', this._formDestroyHandler);
  }
  this._setProperty('innerForm', innerForm);
};

/**
 * Will also be called by model adapter on property change event
 */
scout.WrappedFormField.prototype._renderInnerForm = function() {
  if (!this.innerForm) {
    return;
  }

  this.innerForm.displayHint = scout.Form.DisplayHint.VIEW; // by definition, an inner form is a view.
  this.innerForm.modal = false; // by definition, an inner form is not modal.
  this.innerForm.renderInitialFocusEnabled = this.initialFocusEnabled; // do not render initial focus of form if disabled.

  this.innerForm.render();

  this.addField(this.innerForm.$container);
  this.innerForm.invalidateLayoutTree();

  // required because active element is lost when 'addField' is called.
  this._renderInitialFocusEnabled();
};

scout.WrappedFormField.prototype._removeInnerForm = function() {
  if (this.innerForm) {
    this.innerForm.remove();
  }
  this._removeField();
};

scout.WrappedFormField.prototype._onInnerFormDestroy = function(event) {
  this._removeInnerForm();
  this._setInnerForm(null);
};

scout.WrappedFormField.prototype._renderInitialFocusEnabled = function() {
  if (this.innerForm && this.initialFocusEnabled) {
    this.innerForm.renderInitialFocus();
  }
};
