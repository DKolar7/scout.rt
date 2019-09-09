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
/**
 * Popup menu to switch between outlines.
 */
scout.ViewMenuPopup = function() {
  scout.ViewMenuPopup.parent.call(this);
  this.$tab;
  this.$headBlueprint;
  this.viewMenus;
  this.viewButtonBoxBounds;
  this._addWidgetProperties('viewMenus');
  this._viewMenuActionHandler = this._onViewMenuAction.bind(this);
};
scout.inherits(scout.ViewMenuPopup, scout.PopupWithHead);

scout.ViewMenuPopup.MAX_MENU_WIDTH = 300;

scout.ViewMenuPopup.prototype._init = function(options) {
  options.focusableContainer = true;
  scout.ViewMenuPopup.parent.prototype._init.call(this, options);

  this.$tab = options.$tab;
  this.$headBlueprint = this.$tab;
  this.viewButtonBoxBounds = options.naviBounds;
};

scout.ViewMenuPopup.prototype._createLayout = function() {
  return new scout.ViewMenuPopupLayout(this);
};

/**
 * @override Popup.js
 */
scout.ViewMenuPopup.prototype._initKeyStrokeContext = function() {
  scout.ViewMenuPopup.parent.prototype._initKeyStrokeContext.call(this);

  scout.menuNavigationKeyStrokes.registerKeyStrokes(this.keyStrokeContext, this, 'view-menu-item');
};

scout.ViewMenuPopup.prototype._render = function() {
  scout.ViewMenuPopup.parent.prototype._render.call(this);

  this.viewMenus.forEach(function(viewMenu) {
    viewMenu.renderAsMenuItem(this.$body);
    viewMenu.on('action', this._viewMenuActionHandler);
  }, this);

  // Add last marker to last visible item
  var lastVisibleMenu = scout.arrays.findFromReverse(this.viewMenus, this.viewMenus.length - 1, function(viewMenu) {
    return viewMenu.visible;
  }, this);
  lastVisibleMenu.$container.addClass('last');

  this._installScrollbars({
    axis: 'y'
  });
};

scout.ViewMenuPopup.prototype._remove = function() {
  this.viewMenus.forEach(function(viewMenu) {
    viewMenu.off('action', this._viewMenuActionHandler);
  }, this);

  scout.ViewMenuPopup.parent.prototype._remove.call(this);
};

/**
 * @override
 */
scout.ViewMenuPopup.prototype.get$Scrollable = function() {
  return this.$body;
};

/**
 * @override PopupWithHead.js
 */
scout.ViewMenuPopup.prototype._renderHead = function() {
  scout.ViewMenuPopup.parent.prototype._renderHead.call(this);

  this._copyCssClassToHead('view-menu');
  this._copyCssClassToHead('unfocusable');
  this.$head.removeClass('popup-head');
  this.$head.addClass('view-menu-popup-head');
};

/**
 * @override PopupWithHead.js
 */
scout.ViewMenuPopup.prototype._modifyBody = function() {
  this.$body.removeClass('popup-body');
  this.$body.addClass('view-menu-popup-body');
};

scout.ViewMenuPopup.prototype.position = function() {
  var pos = this.$tab.offset(),
    headSize = scout.graphics.size(this.$tab, true),
    bodyTop = headSize.height;

  scout.graphics.setBounds(this.$head, pos.left, pos.top, headSize.width, headSize.height);

  this.$deco.cssLeft(pos.left);
  this.$deco.cssTop(0);
  this.$deco.cssWidth(headSize.width - 1);

  this.$head.cssTop(-bodyTop);
  this.$body.cssTop(0);
  this.$container.cssMarginTop(headSize.height);

  this.setLocation(new scout.Point(0, 0));
};

scout.ViewMenuPopup.prototype._onViewMenuAction = function(event) {
  this.close();
};
