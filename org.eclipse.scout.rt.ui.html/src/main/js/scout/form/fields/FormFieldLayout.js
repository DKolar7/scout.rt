/**
 * Form-Field Layout, for a form-field with label, status, mandatory-indicator and a field.
 * This layout class works with a FormField instance, since we must access properties of the model.
 * Note: we use optGet() here, since some form-fields have only a bare HTML element as field, other
 * (composite) form-fields work with a HtmlComponent which has its own LayoutManager.
 */
scout.FormFieldLayout = function(formField) {
  scout.FormFieldLayout.parent.call(this);
  this.formField = formField;
  this.labelWidth = scout.HtmlEnvironment.fieldLabelWidth;
  this.mandatoryIndicatorWidth = scout.HtmlEnvironment.fieldMandatoryIndicatorWidth;
  this.statusWidth = scout.HtmlEnvironment.fieldStatusWidth;
  this.rowHeight = scout.HtmlEnvironment.formRowHeight;

  // Minimum field with to normal state, for smaller widths the "compact" style is applied.
  this.MIN_FIELD_WIDTH = 50;
};
scout.inherits(scout.FormFieldLayout, scout.AbstractLayout);

scout.FormFieldLayout.prototype.layout = function($container) {
  var containerPadding, fieldOffset, fieldSize, fieldBounds, htmlField, labelHasFieldWidth, top, bottom, left, right,
    htmlContainer = scout.HtmlComponent.get($container),
    formField = this.formField,
    labelWidth = this.labelWidth,
    statusWidth = this.statusWidth;

  // Note: Position coordinates start _inside_ the border, therefore we only use the padding
  containerPadding = htmlContainer.getInsets({
    includeBorder: false
  });
  top = containerPadding.top;
  right = containerPadding.right;
  bottom = containerPadding.bottom;
  left = containerPadding.left;

  if (this._isLabelVisible()) {
    // currently a gui only flag, necessary for sequencebox
    if (formField.labelUseUiWidth) {
      if (formField.$label.hasClass('empty')) {
        labelWidth = 0;
      } else {
        labelWidth = scout.graphics.prefSize(formField.$label, true).width;
      }
    }
    if (scout.helpers.isOneOf(formField.labelPosition, scout.FormField.LABEL_POSITION_DEFAULT, scout.FormField.LABEL_POSITION_LEFT)) {
      scout.graphics.setBounds(formField.$label, top, left, labelWidth, this.rowHeight);
      left += labelWidth;
    } else if (formField.labelPosition === scout.FormField.LABEL_POSITION_TOP) {
      top += formField.$label.outerHeight(true);
      labelHasFieldWidth = true;
    }
  }
  if (formField.$mandatory) {
    formField.$mandatory
      .cssTop(top)
      .cssLeft(left)
      .cssWidth(this.mandatoryIndicatorWidth);
    left += formField.$mandatory.outerWidth(true);
  }
  if (this._isStatusVisible()) {
    formField.$status
      .cssRight(right)
      .cssWidth(statusWidth)
      .cssHeight(this.rowHeight);
    // If both status and label position is "top", pull status up (without margin on the right side)
    if (formField.statusPosition === scout.FormField.STATUS_POSITION_TOP && labelHasFieldWidth) {
      // Calculate distance from top border to label line
      var h = formField.$label.outerHeight(false);
      // Vertically center status between lines
      var statusTop = containerPadding.top + Math.floor(h / 2) - (this.rowHeight / 2);
      formField.$status
        .cssTop(statusTop);
    } else {
      // Default status position
      formField.$status
        .cssTop(top)
        .cssLineHeight(this.rowHeight);
      right += statusWidth + formField.$status.cssMarginX();
    }
  }

  if (formField.$fieldContainer) {
    // Calculate the additional field offset (because of label, mandatory indicator etc.) without the containerInset.
    fieldOffset = new scout.Insets(
        top - containerPadding.top,
        right - containerPadding.right,
        bottom - containerPadding.bottom,
        left - containerPadding.left);
    // Calculate field size: "available size" - "insets (border and padding)" - "additional offset" - "field's margin"
    fieldSize = htmlContainer.getAvailableSize()
      .subtract(htmlContainer.getInsets())
      .subtract(fieldOffset)
      .subtract(scout.graphics.getMargins(formField.$fieldContainer));
    fieldBounds = new scout.Rectangle(left, top, fieldSize.width, fieldSize.height);
    if (formField.$fieldContainer.css('position') !== 'absolute') {
      fieldBounds.x = 0;
      fieldBounds.y = 0;
    }
    htmlField = scout.HtmlComponent.optGet(formField.$fieldContainer);
    if (htmlField) {
      htmlField.setBounds(fieldBounds);
    } else {
      scout.graphics.setBounds(formField.$fieldContainer, fieldBounds);
    }
    formField.$field.toggleClass('compact', fieldBounds.width < this.MIN_FIELD_WIDTH);

    if (labelHasFieldWidth) {
      formField.$label.cssWidth(fieldBounds.width);
    }
  }

  // Icon is placed inside the field (as overlay)
  if (formField.$icon && formField.$field) {
    formField.$icon
      .cssRight(formField.$field.cssBorderRightWidth() + right)
      .cssTop(top);
  }

  // Make sure tooltip is at correct position after layouting, if there is one
  if (formField.tooltip && formField.tooltip.rendered) {
    formField.tooltip.position();
  }

  // Check for scrollbars, update them if neccessary
  if (formField.$field) {
    scout.scrollbars.update(formField.$field);
    this._layoutDisabledOverlay(formField);
  }
};

scout.FormFieldLayout.prototype._layoutDisabledOverlay = function(formField) {
  if (scout.device.supportsCopyFromDisabledInputFields()) {
    return;
  }
  var $disabledOverlay = formField._$disabledOverlay,
    $field = formField.$field;
  if ($disabledOverlay) {
    var pos = $field.position(),
      padding = scout.graphics.getInsets($field, {includePadding: true});
    $disabledOverlay
      .css('top', pos.top)
      .css('left', pos.left)
      .width($field.width() + padding.horizontal())
      .height($field.height()  + padding.vertical());
  }
};

scout.FormFieldLayout.prototype._isLabelVisible = function() {
  return this.formField.$label && this.formField.labelVisible;
};

scout.FormFieldLayout.prototype._isStatusVisible = function() {
  return this.formField.$status && (this.formField.statusVisible || this.formField.$status.isVisible());
};

scout.FormFieldLayout.prototype.preferredLayoutSize = function($container) {
  var prefSize, htmlField, labelPositionLeft,
    width = 0,
    htmlContainer = scout.HtmlComponent.get($container),
    height = scout.HtmlEnvironment.formRowHeight,
    labelWidth = this.labelWidth,
    statusWidth = this.statusWidth,
    formField = this.formField;

  if (this._isLabelVisible()) {
    if (formField.labelUseUiWidth) {
      if (formField.$label.hasClass('empty')) {
        labelWidth = 0;
      } else {
        labelWidth = scout.graphics.prefSize(formField.$label, true).width;
      }
    }
    labelPositionLeft = formField.labelPosition === scout.FormField.LABEL_POSITION_DEFAULT ||
      formField.labelPosition === scout.FormField.LABEL_POSITION_LEFT;
    if (labelPositionLeft) {
      width += labelWidth;
    } else if (formField.labelPosition === scout.FormField.LABEL_POSITION_TOP) {
      height += formField.$label.outerHeight(true);
    }
  }
  if (formField.$mandatory) {
    width += formField.$mandatory.outerWidth(true);
  }
  if (this._isStatusVisible()) {
    width += statusWidth + formField.$status.cssMarginX();
  }

  if (formField.$fieldContainer) {
    htmlField = scout.HtmlComponent.optGet(formField.$fieldContainer);
    if (htmlField) {
      prefSize = htmlField.getPreferredSize()
        .add(htmlContainer.getInsets())
        .add(htmlField.getMargins());
    } else {
      prefSize = this.naturalSize(formField);
    }
  } else {
    prefSize = new scout.Dimension(0, 0);
  }
  width += prefSize.width;
  height = Math.max(height, prefSize.height);

  return new scout.Dimension(width, height);
};

/**
 * Returns the 'natural' size of the field - which means the current size of the field in the browser.
 * By default we return the size of the $fieldContainer. Override this method when you must return
 * another size (which is required when the field-content is scrollable).
 */
scout.FormFieldLayout.prototype.naturalSize = function(formField) {
  return scout.graphics.prefSize(formField.$fieldContainer, true);
};
