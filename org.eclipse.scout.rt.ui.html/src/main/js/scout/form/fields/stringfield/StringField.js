/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.StringField = function() {
  scout.StringField.parent.call(this);
  this._onSelectionChangingActionHandler = this._onSelectionChangingAction.bind(this);
};
scout.inherits(scout.StringField, scout.BasicField);

scout.StringField.FORMAT = {
  LOWER: 'a' /* IStringField.FORMAT_LOWER */ ,
  UPPER: 'A' /* IStringField.FORMAT_UPPER */
};

/**
 * @override ModelAdapter.js
 */
scout.StringField.prototype._initKeyStrokeContext = function(keyStrokeContext) {
  scout.StringField.parent.prototype._initKeyStrokeContext.call(this, keyStrokeContext);

  keyStrokeContext.registerKeyStroke([
    new scout.StringFieldEnterKeyStroke(this),
    new scout.StringFieldCtrlEnterKeyStroke(this)
  ]);
};

/**
 * @override Widget.js
 */
scout.StringField.prototype._createKeyStrokeContext = function() {
  return new scout.InputFieldKeyStrokeContext();
};

scout.StringField.prototype._render = function($parent) {
  this.addContainer($parent, 'string-field');
  this.addLabel();
  this.addMandatoryIndicator();

  var $field;
  if (this.multilineText) {
    $field = $parent.makeElement('<textarea>')
      .on('DOMMouseScroll mousewheel', function(event) {
        // otherwise scout.Scrollbar.prototype would handle this event for scrollable group boxes and prevent scrolling on textarea
        event.stopPropagation();
    });
  } else {
    $field = scout.fields.makeTextField($parent);
  }
  $field.on('blur', this._onFieldBlur.bind(this));

  // add drag and drop support
  this.dragAndDropHandler = scout.dragAndDrop.handler(this,
    scout.dragAndDrop.SCOUT_TYPES.FILE_TRANSFER,
    function() {
      return this.dropType;
    }.bind(this),
    function() {
      return this.dropMaximumSize;
    }.bind(this));
  this.dragAndDropHandler.install($field);

  this.addField($field);
  this.addStatus();
};

scout.StringField.prototype._renderProperties = function() {
  scout.StringField.parent.prototype._renderProperties.call(this);

  this._renderInputMasked(this.inputMasked);
  this._renderWrapText(this.wrapText);
  this._renderFormat(this.format);
  this._renderSpellCheckEnabled(this.spellCheckEnabled);
  this._renderHasAction(this.hasAction);
  this._renderMaxLength();
  this._renderSelectionStart();
  this._renderSelectionEnd();
  this._renderSelectionTrackingEnabled();
};

scout.StringField.prototype._renderMaxLength = function(maxLength0) {
  var maxLength = maxLength0 || this.maxLength;
  if (this.$field[0].maxLength) {
    this.$field[0].maxLength = maxLength;
  } else {
    this.$field.on("keyup paste", function(e) {
      setTimeout(function() {
        var currLength = this.$field.val().length;

        if (currLength > this.maxLength) {
          this.$field.val(this.$field.val().slice(0, this.maxLength));
        }
      }.bind(this), 0);
    }.bind(this));
  }
};

scout.StringField.prototype._renderSelectionStart = function() {
  this.$field[0].selectionStart = this.selectionStart;
};

scout.StringField.prototype._renderSelectionEnd = function() {
  this.$field[0].selectionEnd = this.selectionEnd;
};

scout.StringField.prototype._renderSelectionTrackingEnabled = function() {
  this.$field
    .off('select', this._onSelectionChangingActionHandler)
    .off('mousedown', this._onSelectionChangingActionHandler)
    .off('keydown', this._onSelectionChangingActionHandler)
    .off('input', this._onSelectionChangingActionHandler);
  if (this.selectionTrackingEnabled) {
    this.$field.on('select', this._onSelectionChangingActionHandler)
      .on('mousedown', this._onSelectionChangingActionHandler)
      .on('keydown', this._onSelectionChangingActionHandler)
      .on('input', this._onSelectionChangingActionHandler);
  }
};

scout.StringField.prototype._renderInputMasked = function(inputMasked) {
  if (this.multilineText) {
    return;
  }
  this.$field.attr('type', (inputMasked ? 'password' : 'text'));
};

scout.StringField.prototype._renderHasAction = function(decorationLink) {
  if (decorationLink) {
    this.$container.addClass("has-action");
    this.addIcon();
    this.revalidateLayout();
  } else {
    if (this.$icon) {
      this.$icon.remove();
      this.$container.removeClass("has-action");
    }
  }
};

scout.StringField.prototype._renderFormat = function(fmt) {
  if (fmt === scout.StringField.FORMAT.LOWER) {
    this.$field.css('text-transform', 'lowercase');
  } else if (fmt === scout.StringField.FORMAT.UPPER) {
    this.$field.css('text-transform', 'uppercase');
  }
};

scout.StringField.prototype._renderSpellCheckEnabled = function(spellCheckEnabled) {
  if (spellCheckEnabled) {
    this.$field.attr('spellcheck', 'true');
  } else {
    this.$field.attr('spellcheck', 'false');
  }
};

// Not called in _renderProperties() because this is not really a property (more like an event)
scout.StringField.prototype._renderInsertText = function() {
  var s = this.insertText;
  if (s && this.$field.length > 0) {
    var elem = this.$field[0];
    var a = 0;
    var b = 0;
    if (elem.selectionStart !== undefined && elem.selectionEnd !== undefined) {
      a = elem.selectionStart;
      b = elem.selectionEnd;
    }
    var text = elem.value;
    text = text.slice(0, a) + s + text.slice(b);
    elem.value = text;

    // Make sure display text gets sent (necessary if field does not have the focus)
    if (this.updateDisplayTextOnModify) {
      // If flag is true, we need to send two events (First while typing=true, second = false)
      this.acceptInput(true);
    }
    this.acceptInput();
  }
};

scout.StringField.prototype._renderWrapText = function() {
  this.$field.attr('wrap', this.wrapText ? 'soft' : 'off');
};

scout.StringField.prototype._renderGridData = function() {
  this.updateInnerAlignment({
    useHorizontalAlignment: (this.multilineText ? false : true)
  });
};

scout.StringField.prototype._onIconClick = function(event) {
  this.acceptInput();
  scout.StringField.parent.prototype._onIconClick.call(this, event);
  this._send('callAction');
};

scout.StringField.prototype._onSelectionChangingAction = function(event) {
  if (event.type === 'mousedown') {
    this.$field.getWindow(true).one('mouseup.stringfield', function() {
      // For some reason, when clicking side an existing selection (which clears the selection), the old
      // selection is still visible. To get around this case, we use setTimeout to handle the new selection
      // after it really has been changed.
      setTimeout(this._updateSelection.bind(this));
    }.bind(this));
  } else {
    this._updateSelection();
  }
};

scout.StringField.prototype._updateSelection = function() {
  var oldSelectionStart = this.selectionStart;
  var oldSelectionEnd = this.selectionEnd;
  this.selectionStart = this.$field[0].selectionStart;
  this.selectionEnd = this.$field[0].selectionEnd;
  var selectionChanged = (this.selectionStart !== oldSelectionStart || this.selectionEnd !== oldSelectionEnd);

  if (selectionChanged) {
    this._sendSelectionChanged();
  }
};

scout.StringField.prototype._sendSelectionChanged = function() {
  var eventData = {
    selectionStart: this.selectionStart,
    selectionEnd: this.selectionEnd
  };

  // send delayed to avoid a lot of requests while selecting
  // coalesce: only send the latest selection changed event for a field
  this._send('selectionChanged', eventData, 500, function(previous) {
    return this.id === previous.id && this.type === previous.type;
  });
};
