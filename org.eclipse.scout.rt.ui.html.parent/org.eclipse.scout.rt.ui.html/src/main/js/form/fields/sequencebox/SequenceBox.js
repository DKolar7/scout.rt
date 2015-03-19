scout.SequenceBox = function() {
  scout.SequenceBox.parent.call(this);
  this._addAdapterProperties('fields');
};

scout.inherits(scout.SequenceBox, scout.CompositeField);

scout.SequenceBox.prototype._render = function($parent) {
  var field, i;
  this.addContainer($parent, 'sequence-box');
  this.addLabel();
  this.addField($('<div>'));
  var htmlComp = new scout.HtmlComponent(this.$field, this.session);
  htmlComp.setLayout(new scout.LogicalGridLayout(8, 0));
  for (i = 0; i < this.fields.length; i++) {
    field = this.fields[i];
    field.labelUseUiWidth = true;
    field.render(this.$field);
    this._modifyLabel(field);
  }
};

// TODO AWE: (scout, sequence-box) remove _modifyLabel when CheckboxForm uses SequenceBox5
// The new sequence-box sets the label to invisible on the model.
scout.SequenceBox.prototype._modifyLabel = function(field) {
  if (field instanceof scout.CheckBoxField) {
    field.labelVisible = false;
  }
};

/**
 * @override CompositeField.js
 */
scout.SequenceBox.prototype.getFields = function() {
  return this.fields;
};
