/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.TagField = function() {
  scout.TagField.parent.call(this);

  this.$field = null;
  this.fieldHtmlComp = null;
  this.popup = null;
  this.lookupCall = null;
  this._currentLookupCall = null;
  this.tagBar = null;
};
scout.inherits(scout.TagField, scout.ValueField);

scout.TagField.prototype._init = function(model) {
  scout.TagField.parent.prototype._init.call(this, model);

  this.tagBar = scout.create('TagBar', {
    parent: this,
    tags: this.value
  });
  this.tagBar.on('tagRemove', this._onTagRemove.bind(this));
  this.on('propertyChange', this._onValueChange.bind(this));
  this._setLookupCall(this.lookupCall);
};

scout.TagField.prototype._onTagRemove = function(event) {
  this.removeTag(event.tag);
};

scout.TagField.prototype._initKeyStrokeContext = function() {
  scout.TagField.parent.prototype._initKeyStrokeContext.call(this);
  this.keyStrokeContext.registerKeyStroke([
    new scout.TagFieldCancelKeyStroke(this),
    new scout.TagFieldEnterKeyStroke(this),
    new scout.TagFieldNavigationKeyStroke(this._createFieldAdapter()),
    new scout.TagFieldDeleteKeyStroke(this._createFieldAdapter()),
    new scout.TagFieldOpenPopupKeyStroke(this)
  ]);
};

scout.TagField.prototype._createKeyStrokeContext = function() {
  return new scout.InputFieldKeyStrokeContext();
};

scout.TagField.prototype._render = function() {
  this.addContainer(this.$parent, 'tag-field', new scout.TagFieldLayout(this));
  this.addLabel();
  this.addMandatoryIndicator();
  var $fieldContainer = this.$container.appendDiv();
  this.fieldHtmlComp = scout.HtmlComponent.install($fieldContainer, this.session);
  this.fieldHtmlComp.setLayout(new scout.TagFieldContainerLayout(this));
  this.tagBar.render($fieldContainer);
  var $field = $fieldContainer.appendElement('<input>', 'field')
    .on('keydown', this._onInputKeydown.bind(this))
    .on('keyup', this._onInputKeyup.bind(this))
    .on('input', this._onFieldInput.bind(this));
  this.addFieldContainer($fieldContainer);
  this.addField($field);
  this.addStatus();
};

scout.TagField.prototype._renderProperties = function() {
  scout.TagField.parent.prototype._renderProperties.call(this);
  this._renderValue();
};

scout.TagField.prototype._renderValue = function() {
  this.tagBar.updateTags();
};

scout.TagField.prototype._setValue = function(value) {
  scout.TagField.parent.prototype._setValue.call(this, value);
  if (this.tagBar) { // required for _init case
    this.tagBar.setTags(this.value /* do not use the function parameter here. instead use the member variable because the value might have changed in a validator. */ );
  }
};

scout.TagField.prototype._setLookupCall = function(lookupCall) {
  this._setProperty('lookupCall', scout.LookupCall.ensure(lookupCall, this.session));
};

scout.TagField.prototype.formatValue = function(value) {
  // Info: value and displayText are not related in the TagField
  return '';
};

/**
 * @override ValueField.js
 */
scout.TagField.prototype._validateValue = function(value) {
  var tags = scout.arrays.ensure(value);
  var result = [];
  tags.forEach(function(tag) {
    if (!scout.strings.empty(tag)) {
      tag = tag.toLowerCase();
      if (result.indexOf(tag) < 0) {
        result.push(tag);
      }
    }
  });
  return result;
};

scout.TagField.prototype._parseValue = function(displayText) {
  var tags = scout.arrays.ensure(this.value);
  tags = tags.slice();
  tags.push(displayText);
  return tags;
};

scout.TagField.prototype._renderDisplayText = function() {
  this.$field.val(this.displayText); // needs to be before super call (otherwise updateHasText fails)
  scout.TagField.parent.prototype._renderDisplayText.call(this);
  this._updateInputVisible();
};

scout.TagField.prototype._renderEnabled = function() {
  scout.TagField.parent.prototype._renderEnabled.call(this);
  this._updateInputVisible();
};

scout.TagField.prototype._renderFieldStyle = function() {
  scout.TagField.parent.prototype._renderFieldStyle.call(this);
  if (this.rendered) {
    this.fieldHtmlComp.invalidateLayoutTree();
  }
};

scout.TagField.prototype._updateInputVisible = function() {
  var visible, oldVisible = !this.$field.isVisible();
  if (this.enabledComputed) {
    visible = true;
  } else {
    visible = scout.strings.hasText(this.displayText);
  }
  this.$field.setVisible(visible);
  // update tag-elements (must remove X when disabled)
  if (visible !== oldVisible) {
    this._renderValue();
  }
};

scout.TagField.prototype._readDisplayText = function() {
  return this.$field.val();
};

scout.TagField.prototype._clear = function() {
  this.$field.val('');
};

/**
 * @override
 */
scout.TagField.prototype.acceptInput = function(whileTyping) {
  if (this.popup) {
    if (this.popup.selectedRow()) {
      this.popup.triggerLookupRowSelected();
    } else {
      this.closePopup();
    }
    return;
  }
  scout.TagField.parent.prototype.acceptInput.call(this, false);
};

scout.TagField.prototype._triggerAcceptInput = function() {
  this.trigger('acceptInput', {
    displayText: this.displayText,
    value: this.value
  });
};

/**
 * @override
 */
scout.TagField.prototype.aboutToBlurByMouseDown = function(target) {
  if (scout.fields.eventOutsideProposalField(this, target)) {
    this.acceptInput(true);
  }
};


/**
 * @override
 */
scout.TagField.prototype._onFieldBlur = function(event) {
  // We cannot call super until chooser popup has been closed (see #acceptInput)
  this.closePopup();
  scout.TagField.parent.prototype._onFieldBlur.call(this, event);
  if (this.rendered && !this.removing) {
    this.tagBar.blur();
  }
};

/**
 * @override
 */
scout.TagField.prototype._onFieldFocus = function(event) {
  scout.TagField.parent.prototype._onFieldFocus.call(this, event);
  if (this.rendered && !this.removing) {
    this.tagBar.focus();
  }
};

scout.TagField.prototype._onFieldInput = function() {
  this._updateHasText();
};

scout.TagField.prototype.addTag = function(text) {
  var value = this._parseValue(text);
  this.setValue(value);
  this._triggerAcceptInput();
};

scout.TagField.prototype.removeTag = function(tag) {
  if (scout.strings.empty(tag)) {
    return;
  }
  tag = tag.toLowerCase();
  var tags = scout.arrays.ensure(this.value);
  if (tags.indexOf(tag) === -1) {
    return;
  }
  tags = tags.slice();
  scout.arrays.remove(tags, tag);
  this.setValue(tags);
  this._triggerAcceptInput();
  // focus was previously on the removed tag, restore focus on the field.
  this.focus();
};

scout.TagField.prototype._onInputKeydown = function(event) {
  if (this._isNavigationKey(event) && this.popup) {
    this.popup.delegateKeyEvent(event);
  } else if (event.which === scout.keys.ESC) {
    this.closePopup();
  }
};

scout.TagField.prototype._isNavigationKey = function(event) {
  return scout.isOneOf(event.which, [
    scout.keys.PAGE_UP,
    scout.keys.PAGE_DOWN,
    scout.keys.UP,
    scout.keys.DOWN
  ]);
};

scout.TagField.prototype._onInputKeyup = function(event) {
  // Prevent chooser popup from being opened again, after it has been closed by pressing ESC
  if (event.which === scout.keys.ESC) {
    return;
  }

  if (!this._isNavigationKey(event)) {
    this._lookupByText(this.$field.val());
  }
};

scout.TagField.prototype._lookupByText = function(text) {
  if (!this.lookupCall) {
    return null;
  }
  if (scout.strings.empty(text) || text.length < 2) {
    this.closePopup();
    return;
  }

  this._currentLookupCall = this.lookupCall.cloneForText(text);
  this.trigger('prepareLookupCall', {
    lookupCall: this._currentLookupCall
  });
  return this._currentLookupCall
    .execute()
    .always(function() {
      this._currentLookupCall = null;
    }.bind(this))
    .done(this._onLookupDone.bind(this));
};

scout.TagField.prototype._onLookupDone = function(result) {
  try {
    if (!this.rendered || !this.isFocused() || result.lookupRows.length === 0) {
      this.closePopup();
      return;
    }

    this.openPopup();
    this.popup.setLookupResult(result);
  } finally {
    this.trigger('lookupCallDone', {
      result: result
    });
  }
};

scout.TagField.prototype.openPopup = function() {
  if (this.popup) {
    return;
  }
  this.popup = scout.create('TagChooserPopup', {
    parent: this,
    $anchor: this.$field,
    boundToAnchor: true,
    closeOnAnchorMouseDown: false,
    field: this
  });
  this.popup.on('lookupRowSelected', this._onLookupRowSelected.bind(this));
  this.popup.one('close', this._onPopupClose.bind(this));
  this.popup.open();
};

scout.TagField.prototype.closePopup = function() {
  if (this.popup && !this.popup.destroying) {
    this.popup.close();
  }
};

scout.TagField.prototype._onLookupRowSelected = function(event) {
  this._clear();
  this._updateHasText();
  this.addTag(event.lookupRow.key);
  this.closePopup();
};

scout.TagField.prototype._onPopupClose = function(event) {
  this.popup = null;
};

scout.TagField.prototype.isInputFocused = function() {
  var ae = this.$fieldContainer.activeElement();
  return this.$field.is(ae);
};

scout.TagField.prototype._onValueChange = function(event) {
  if ('value' === event.propertyName) {
    this._renderLabel();
  }
};

scout.TagField.prototype._renderPlaceholder = function($field) {
  // only render placeholder when tag field is empty (has no tags)
  var hasTags = !!scout.arrays.ensure(this.value).length;
  $field = scout.nvl($field, this.$field);
  if ($field) {
    $field.placeholder(hasTags ? '' : this.label);
  }
};

scout.TagField.prototype._createFieldAdapter = function() {
  return scout.TagField.createFieldAdapter(this);
};

scout.TagField.createFieldAdapter = function(field) {
  return {
    $container: function() {
      return field.$fieldContainer;
    },

    enabled: function() {
      return scout.strings.empty(field._readDisplayText());
    },

    focus: function() {
      field.$field.focus();
    },

    one: function(p1, p2) {
      field.one(p1, p2);
    },

    off: function(p1, p2) {
      field.off(p1, p2);
    },

    removeTag: function(tag) {
      field.removeTag(tag);
    }
  };
};
