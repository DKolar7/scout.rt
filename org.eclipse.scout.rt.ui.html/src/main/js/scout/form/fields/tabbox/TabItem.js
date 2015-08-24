// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.TabItem = function() {
  scout.TabItem.parent.call(this);
  this.$tabContainer;
  this._tabRendered = false;
  this._tabActive = false;
};
scout.inherits(scout.TabItem, scout.GroupBox);

scout.TabItem.prototype._render = function($parent) {
  scout.TabItem.parent.prototype._render.call(this, $parent);
  // LogicalGridData.isValidateRoot would always return true which is wrong if the data has not been validated yet.
  // Since the tabbox does not use the logical grid layout, noone validates the griddata -> isValidateRoot is never correct.
  // Because there is no logical grid layout, there is no use for the logical grid data.
  this.htmlComp.layoutData = null;
};

/**
 * This method has nothing to do with the regular rendering of the GroupBox. It is an additional method
 * to render a single tab for this tab-item. Since tab and tab-item share the same model.
 *
 * @return tab button as JQuery object
 */
scout.TabItem.prototype.renderTab = function($parent) {
  if (this._tabRendered) {
    throw new Error('Tab already rendered');
  }
  this.$tabContainer = $('<button>')
    .addClass('tab-item')
    .data('tabItem', this)
    .on('mousedown', this._onTabMouseDown.bind(this))
    .appendTo($parent);

  this._renderTabActive();
  this._renderLabel(this.label);
  this._tabRendered = true;
  this._updateTab();
};

scout.TabItem.prototype._onTabMouseDown = function(event) {
  this.parent._selectTab(this);
};

scout.TabItem.prototype.focusTab = function() {
  if (this._tabRendered) {
    this.$tabContainer.focus();
  }
};

scout.TabItem.prototype.setTabActive = function(active) {
  var oldTabActive = this._tabActive;
  this._tabActive = active;
  if (this._tabRendered && oldTabActive !== active) {
    this._renderTabActive();
  }
};

scout.TabItem.prototype._renderTabActive = function() {
  this.$tabContainer.select(this._tabActive);
  if (this._tabActive) {
    this.$tabContainer.removeAttr('tabindex');
  } else {
    this.$tabContainer.attr('tabindex', -1);
  }
};

/**
 * It's allowed to call removeTab() even when the tab is _not_ rendered.
 * This may be the case, when a tab is placed in the overflow-menu of the tab-area.
 * Thus it happens that some tabs are rendered and some are not.
 */
scout.TabItem.prototype.removeTab = function() {
  if (this._tabRendered) {
    this.$tabContainer.remove();
    this.$tabContainer = null;
    this._tabRendered = false;
  }
};

scout.TabItem.prototype._syncMarked = function(marked) {
  this.marked = marked;
  // Special case: If the group box part of the TabItem is NOT (yet) rendered, but the
  // tabButton IS, render the properties that affect the tab button.
  if (!this.rendered && this._tabRendered) {
    this._updateTab();
  }
};

scout.TabItem.prototype._renderMarked = function(marked) {
  this._updateTab();
};

scout.TabItem.prototype._syncVisible = function(visible) {
  this.visible = visible;
  // Special case: If the group box part of the TabItem is NOT (yet) rendered, but the
  // tabButton IS, render the properties that affect the tab button.
  if (!this.rendered && this._tabRendered) {
    this._updateTab();
  }
};

scout.TabItem.prototype._renderVisible = function(visible) {
  scout.TabItem.parent.prototype._renderVisible.call(this, visible);
  this._updateTab();
};

scout.TabItem.prototype._syncLabel = function(label) {
  this.label = label;
  // TODO BSH/AWE/CGU Find a better solution for this!
  // Special case: If the group box part of the TabItem is NOT (yet) rendered, but the
  // tabButton IS, render the properties that affect the tab button.
  if (!this.rendered && this._tabRendered) {
    this._updateTab();
  }
};

scout.TabItem.prototype._renderLabel = function(label) {
  scout.TabItem.parent.prototype._renderLabel.call(this, label);
  this._updateTab();
};

scout.TabItem.prototype._updateTab = function() {
  this.$tabContainer.toggleClass('marked', this.marked);
  this.$tabContainer.setVisible(this.visible);
  this.$tabContainer.textOrNbsp(scout.strings.removeAmpersand(this.label));
};
