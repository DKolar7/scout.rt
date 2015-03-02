scout.CheckBoxField = function() {
  scout.CheckBoxField.parent.call(this);
  this._$checkBox;
  this._$checkBoxLabel;
};
scout.inherits(scout.CheckBoxField, scout.ValueField);

scout.CheckBoxField.prototype._render = function($parent) {
  this.addContainer($parent, 'check-box-field');
  this.addLabel();
  this.addMandatoryIndicator();

  // a wrapper span element is required in order to align the checkbox within
  // the form-field. If we'd apply the width to the checkbox element itself, the
  // checkbox is always in the center.

  this._$checkBox = $('<input>')
    .attr('id', this.refFieldId)
    .attr('type', 'checkbox');

  this.addField(this._$checkBox, $('<span>'));
  this._$checkBox.appendTo(this.$fieldContainer);

  this._$checkBoxLabel = $('<label>')
    .attr('for', this.refFieldId)
    .attr('title', this.label)
    .appendTo(this.$fieldContainer);

  this._$checkBox.on('click', this._onClick.bind(this));
  this.addStatus();
};

scout.CheckBoxField.prototype._onClick = function() {
  var uiChecked = this._$checkBox[0].checked;
  this.session.send(this.id, 'clicked', {
    checked: uiChecked
  });
};

scout.CheckBoxField.prototype._renderProperties = function() {
  scout.CheckBoxField.parent.prototype._renderProperties.call(this);
  this._renderValue(this.value);
};

scout.CheckBoxField.prototype._renderValue = function(value) {
  if (value) {
    this._$checkBox[0].checked = 'checked';
  } else {
    this._$checkBox[0].checked = '';
  }
};

/**
 * @override
 */
scout.CheckBoxField.prototype._renderEnabled = function(enabled) {
  this._$checkBox.setEnabled(enabled);
};

/**
 * @override
 */
scout.CheckBoxField.prototype._renderLabel = function(label) {
  if (!label) {
    label = '';
  }
  if (this._$checkBoxLabel) {
    this._$checkBoxLabel.html(label);
  }
};
