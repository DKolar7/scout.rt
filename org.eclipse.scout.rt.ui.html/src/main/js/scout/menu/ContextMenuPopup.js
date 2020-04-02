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
scout.ContextMenuPopup = function() {
  scout.ContextMenuPopup.parent.call(this);

  // Make sure head won't be rendered, there is a css selector which is applied only if there is a head
  this._headVisible = false;
  this.menuItems = [];
  this.cloneMenuItems = true;
  this._toggleSubMenuQueue = [];
};
scout.inherits(scout.ContextMenuPopup, scout.PopupWithHead);

scout.ContextMenuPopup.prototype._init = function(options) {
  options.focusableContainer = true; // In order to allow keyboard navigation, the popup must gain focus. Because menu-items are not focusable, make the container focusable instead.

  // If menu items are cloned, don't link the original menus with the popup, otherwise they would be removed when the context menu is removed
  if (options.cloneMenuItems === false) {
    this._addWidgetProperties('menuItems');
  }

  scout.ContextMenuPopup.parent.prototype._init.call(this, options);
};

/**
 * @override Popup.js
 */
scout.ContextMenuPopup.prototype._initKeyStrokeContext = function() {
  scout.ContextMenuPopup.parent.prototype._initKeyStrokeContext.call(this);

  scout.menuNavigationKeyStrokes.registerKeyStrokes(this.keyStrokeContext, this, 'menu-item');
};

scout.ContextMenuPopup.prototype._createLayout = function() {
  return new scout.ContextMenuPopupLayout(this);
};

scout.ContextMenuPopup.prototype._createBodyLayout = function() {
  return new scout.RowLayout({
    pixelBasedSizing: false
  });
};

scout.ContextMenuPopup.prototype._render = function() {
  scout.ContextMenuPopup.parent.prototype._render.call(this);
  this._installScrollbars();
  this._renderMenuItems();
};

/**
 * @override
 */
scout.ContextMenuPopup.prototype._installScrollbars = function(options) {
  scout.ContextMenuPopup.parent.prototype._installScrollbars.call(this, {
    axis: 'y'
  });
};

/**
 * @override
 */
scout.ContextMenuPopup.prototype.get$Scrollable = function() {
  return this.$body;
};

scout.ContextMenuPopup.prototype.removeSubMenuItems = function(parentMenu, animated) {
  if (!this.rendered && !this.rendering) {
    return;
  }
  if (this.bodyAnimating) {
    // Let current animation finish and execute afterwards to prevent an unpredictable behavior and inconsistent state
    this._toggleSubMenuQueue.push(this.removeSubMenuItems.bind(this, parentMenu, animated));
    return;
  }

  this.$body = parentMenu.parentMenu.$subMenuBody;
  // move new body to back
  this.$body.insertBefore(parentMenu.$subMenuBody);

  if (parentMenu.parentMenu._doActionTogglesSubMenu) {
    parentMenu.parentMenu._doActionTogglesSubMenu();
  }

  var actualBounds = this.htmlComp.offsetBounds();

  this.revalidateLayout();
  this.position();

  if (animated) {
    this.bodyAnimating = true;
    var duration = 300;
    var position = parentMenu.$placeHolder.position();
    parentMenu.$subMenuBody.css({
      width: 'auto',
      height: 'auto'
    });
    var targetSize = this.htmlComp.size();
    parentMenu.$subMenuBody.css('box-shadow', 'none');
    this.htmlComp.setBounds(actualBounds);
    if (this.openingDirectionY !== 'up') {
      // set container to element
      parentMenu.$subMenuBody.cssTop();
    }
    // move new body to top of popup
    parentMenu.$subMenuBody.cssHeightAnimated(actualBounds.height, parentMenu.$container.cssHeight(), {
      duration: duration,
      queue: false
    });

    var endTopposition = position.top - this.$body.cssHeight(),
      startTopposition = 0 - actualBounds.height;

    parentMenu.$subMenuBody.cssTopAnimated(startTopposition, endTopposition, {
      duration: duration,
      queue: false,
      complete: function() {
        if (parentMenu.$container) { //check if $container is not removed before by closing operation.
          scout.scrollbars.uninstall(parentMenu.$subMenuBody, this.session);
          parentMenu.$placeHolder.replaceWith(parentMenu.$container);
          parentMenu.$container.toggleClass('expanded', false);
          this._updateFirstLastClass();
          this.updateNextToSelected('menu-item', parentMenu.$container);

          parentMenu.$subMenuBody.detach();
          this._installScrollbars();
          this.$body.css('box-shadow', '');
          this.bodyAnimating = false;
          // Do one final layout to fix any potentially wrong sizes (e.g. due to async image loading)
          this._invalidateLayoutTreeAndRepositionPopup();
          var next = this._toggleSubMenuQueue.shift();
          if (next) {
            next();
          }
        }
      }.bind(this)
    });

    this.$body.cssWidthAnimated(actualBounds.width, targetSize.width, {
      duration: duration,
      start: this.revalidateLayout.bind(this),
      progress: this.revalidateLayout.bind(this),
      queue: false
    });

    if (targetSize.height !== actualBounds.height) {
      this.$body.cssHeightAnimated(actualBounds.height, targetSize.height, {
        duration: duration,
        queue: false
      });
    }
  }
};

scout.ContextMenuPopup.prototype.renderSubMenuItems = function(parentMenu, menus, animated, initialSubMenuRendering) {
  if (!this.session.desktop.rendered && !initialSubMenuRendering) {
    this.initialSubMenusToRender = {
      parentMenu: parentMenu,
      menus: menus
    };
    return;
  }
  if (!this.rendered && !this.rendering) {
    return;
  }
  if (this.bodyAnimating) {
    // Let current animation finish and execute afterwards to prevent an unpredictable behavior and inconsistent state
    this._toggleSubMenuQueue.push(this.renderSubMenuItems.bind(this, parentMenu, menus, animated, initialSubMenuRendering));
    return;
  }

  var actualBounds = this.htmlComp.offsetBounds();

  parentMenu.parentMenu.$subMenuBody = this.$body;

  var $all = this.$body.find('.' + 'menu-item');
  $all.removeClass('next-to-selected');

  if (!parentMenu.$subMenuBody) {
    this._$createBody();
    parentMenu.$subMenuBody = this.$body;
    this._renderMenuItems(menus, initialSubMenuRendering);
  } else {
    // append $body
    this.$body = parentMenu.$subMenuBody;
  }
  var $insertAfterElement = parentMenu.$container.prev();
  var position = parentMenu.$container.position();
  parentMenu.$placeHolder = parentMenu.$container.clone();
  // HtmlComponent is necessary for the row layout (it would normally be installed by Menu.js, but $placeholder is just a jquery clone of parentMenu.$container and is not managed by a real widget)
  scout.HtmlComponent.install(parentMenu.$placeHolder, this.session);
  if ($insertAfterElement.length) {
    parentMenu.$placeHolder.insertAfter($insertAfterElement);
  } else {
    parentMenu.parentMenu.$subMenuBody.prepend(parentMenu.$placeHolder);
  }

  this.$body.insertAfter(parentMenu.parentMenu.$subMenuBody);
  this.$body.prepend(parentMenu.$container);
  parentMenu.$container.toggleClass('expanded');

  this.revalidateLayout();
  this.position();

  this.updateNextToSelected();

  if (animated) {
    this.bodyAnimating = true;
    var duration = 300;
    parentMenu.parentMenu.$subMenuBody.css({
      width: 'auto',
      height: 'auto'
    });
    var targetBounds = this.htmlComp.offsetBounds();
    this.$body.css('box-shadow', 'none');
    // set container to element
    this.$body.cssWidthAnimated(actualBounds.width, targetBounds.width, {
      duration: duration,
      start: this.revalidateLayout.bind(this),
      progress: this.revalidateLayout.bind(this),
      queue: false
    });

    this.$body.cssHeightAnimated(parentMenu.$container.cssHeight(), targetBounds.height, {
      duration: duration,
      queue: false
    });

    var endTopposition = 0 - targetBounds.height,
      startTopposition = position.top - parentMenu.parentMenu.$subMenuBody.cssHeight(),
      topMargin = 0;

    // move new body to top of popup.
    this.$body.cssTopAnimated(startTopposition, endTopposition, {
      duration: duration,
      queue: false,
      complete: function() {
        this.bodyAnimating = false;
        if (parentMenu.parentMenu.$subMenuBody) {
          scout.scrollbars.uninstall(parentMenu.parentMenu.$subMenuBody, this.session);
          parentMenu.parentMenu.$subMenuBody.detach();
          this.$body.cssTop(topMargin);
          this._installScrollbars();
          this._updateFirstLastClass();
          this.$body.css('box-shadow', '');
        }
        // Do one final layout to fix any potentially wrong sizes (e.g. due to async image loading)
        this._invalidateLayoutTreeAndRepositionPopup();
        var next = this._toggleSubMenuQueue.shift();
        if (next) {
          next();
        }
      }.bind(this)
    });

    if (actualBounds.height !== targetBounds.height) {
      parentMenu.parentMenu.$subMenuBody.cssHeightAnimated(actualBounds.height, targetBounds.height, {
        duration: duration,
        queue: false
      });
      this.$container.cssHeight(actualBounds.height, targetBounds.height, {
        duration: duration,
        queue: false
      });
    }
    if (this.openingDirectionY === 'up') {
      this.$container.cssTopAnimated(actualBounds.y, targetBounds.y, {
        duration: duration,
        queue: false
      }).css('overflow', 'visible');
      // ajust top of head and deco
      this.$head.cssTopAnimated(actualBounds.height, targetBounds.height, {
        duration: duration,
        queue: false
      });
      this.$deco.cssTopAnimated(actualBounds.height - 1, targetBounds.height - 1, {
        duration: duration,
        queue: false
      });
    }
  } else {
    if (!initialSubMenuRendering) {
      scout.scrollbars.uninstall(parentMenu.parentMenu.$subMenuBody, this.session);
    }
    parentMenu.parentMenu.$subMenuBody.detach();
    this._installScrollbars();
    this._updateFirstLastClass();
  }
};

scout.ContextMenuPopup.prototype._renderMenuItems = function(menus, initialSubMenuRendering) {
  menus = menus ? menus : this._getMenuItems();
  if (this.menuFilter) {
    menus = this.menuFilter(menus, scout.MenuDestinations.CONTEXT_MENU);
  }

  if (!menus || menus.length === 0) {
    return;
  }

  menus.forEach(function(menu) {
    // Invisible menus are rendered as well because their visibility might change dynamically
    if (menu.separator) {
      return;
    }

    // prevent loosing original parent
    var parentMenu = menu.parent;
    if (this.cloneMenuItems && !menu.cloneOf) {
      // clone will recursively also clone all child actions.
      menu = menu.clone({
        parent: this
      }, {
        delegateEventsToOriginal: ['acceptInput', 'action', 'click'],
        delegateAllPropertiesToClone: true,
        delegateAllPropertiesToOriginal: true,
        excludePropertiesToOriginal: ['selected', 'logicalGrid', 'tabbable']
      });
      menu.setTabbable(false);
      // attach listener
      this._attachCloneMenuListeners(menu);
    }

    // just set once because on second execution of this menu.parent is set to a popup
    if (!menu.parentMenu) {
      menu.parentMenu = parentMenu;
    }
    menu.render(this.$body);
    this._attachMenuListeners(menu);

    // Invalidate popup layout after images icons have been loaded, because the
    // correct size might not be known yet. If the layout would not be revalidated, the popup
    // size will be wrong (text is cut off after image has been loaded).
    // The menu item actually does it by itself, but the popup needs to be repositioned too.
    if (menu.icon) {
      menu.icon.on('load error', this._invalidateLayoutTreeAndRepositionPopup.bind(this));
    }
  }, this);

  this._handleInitialSubMenus(initialSubMenuRendering);
  this._updateFirstLastClass();
};

scout.ContextMenuPopup.prototype._attachCloneMenuListeners = function(menu) {
  menu.on('propertyChange', this._onCloneMenuPropertyChange.bind(this));
  menu.childActions.forEach(this._attachCloneMenuListeners.bind(this));
};

scout.ContextMenuPopup.prototype._onCloneMenuPropertyChange = function(event) {
  if (event.propertyName === 'selected') {
    var menu = event.source;
    // Only trigger property change, setSelected would try to render the selected state which must not happen for the original menu
    menu.cloneOf.triggerPropertyChange('selected', event.oldValue, event.newValue);
  }
};

scout.ContextMenuPopup.prototype._handleInitialSubMenus = function(initialSubMenuRendering) {
  var menusObj;
  while (this.initialSubMenusToRender && !initialSubMenuRendering) {
    menusObj = this.initialSubMenusToRender;
    this.initialSubMenusToRender = undefined;
    this.renderSubMenuItems(menusObj.parentMenu, menusObj.menus, false, true);
  }
};

scout.ContextMenuPopup.prototype._attachMenuListeners = function(menu) {
  var menuItemActionHandler = this._onMenuItemAction.bind(this);
  var menuItemPropertyChange = this._onMenuItemPropertyChange.bind(this);
  menu.on('action', menuItemActionHandler);
  menu.on('propertyChange', menuItemPropertyChange);
  this.one('remove', function() {
    menu.off('action', menuItemActionHandler);
    menu.off('propertyChange', menuItemPropertyChange);
  });
};

/**
 * @override PopupWithHead.js
 */
scout.ContextMenuPopup.prototype._modifyBody = function() {
  this.$body.addClass('context-menu');
};

scout.ContextMenuPopup.prototype.updateMenuItems = function(menuItems) {
  menuItems = scout.arrays.ensure(menuItems);
  // Only update if list of menus changed. Don't compare this.menuItems, because that list
  // may contain additional UI separators, and may not be in the same order
  if (!scout.arrays.equals(this.menuItems, menuItems)) {
    this.close();
  }
};
/**
 * Override this method to return menu items or actions used to render menu items.
 */
scout.ContextMenuPopup.prototype._getMenuItems = function() {
  return this.menuItems;
};

/**
 * Currently rendered $menuItems
 */
scout.ContextMenuPopup.prototype.$menuItems = function() {
  return this.$body.children('.menu-item');
};

scout.ContextMenuPopup.prototype.$visibleMenuItems = function() {
  return this.$body.children('.menu-item:visible');
};

/**
 * Updates the first and last visible menu items with the according css classes.
 * Necessary because invisible menu-items are rendered.
 */
scout.ContextMenuPopup.prototype._updateFirstLastClass = function(event) {
  var $firstMenuItem, $lastMenuItem;

  // TODO [7.0] cgu: after refactoring of menu-item to context-menu-item we can use last/first instead of a fully qualified name. We also could move this function to jquery-scout to make it reusable.
  this.$body.children('.menu-item').each(function() {
    var $menuItem = $(this);
    $menuItem.removeClass('context-menu-item-first context-menu-item-last');

    if ($menuItem.isVisible()) {
      if (!$firstMenuItem) {
        $firstMenuItem = $menuItem;
      }
      $lastMenuItem = $menuItem;
    }
  });
  if ($firstMenuItem) {
    $firstMenuItem.addClass('context-menu-item-first');
  }
  if ($lastMenuItem) {
    $lastMenuItem.addClass('context-menu-item-last');
  }
};

scout.ContextMenuPopup.prototype.updateNextToSelected = function(menuItemClass, $selectedItem) {
  menuItemClass = menuItemClass ? menuItemClass : 'menu-item';
  var $all = this.$body.find('.' + menuItemClass);
  $selectedItem = $selectedItem ? $selectedItem : this.$body.find('.' + menuItemClass + '.selected');

  $all.removeClass('next-to-selected');
  if ($selectedItem.hasClass('selected')) {
    $selectedItem.nextAll(':visible').first().addClass('next-to-selected');
  }
};

scout.ContextMenuPopup.prototype._onMenuItemAction = function(event) {
  this.close();
};

scout.ContextMenuPopup.prototype._onMenuItemPropertyChange = function(event) {
  if (!this.rendered) {
    return;
  }
  if (event.propertyName === 'visible') {
    this._updateFirstLastClass();
  } else if (event.propertyName === 'selected') {
    // Key stroke navigation marks the currently focused item as selected.
    // When a sub menu item is opened while another element is selected (focused), make sure the other element gets unselected.
    // Otherwise two items would be selected when the sub menu is closed again.
    this._deselectSiblings(event.source);
  }
  // Make sure menu is positioned correctly afterwards (if it is opened upwards hiding/showing a menu item makes it necessary to reposition)
  this.position();
};

/**
 * Deselects the visible siblings of the given menu item. It just removes the CSS class and does not modify the selected property.
 */
scout.ContextMenuPopup.prototype._deselectSiblings = function(menuItem) {
  menuItem.$container.siblings('.menu-item').each(function(i, elem) {
    var $menuItem = $(elem);
    $menuItem.select(false);
  }, this);
};

scout.ContextMenuPopup.prototype._invalidateLayoutTreeAndRepositionPopup = function() {
  this.invalidateLayoutTree();
  this.session.layoutValidator.schedulePostValidateFunction(function() {
    if (!this.rendered) { // check needed because this is an async callback
      return;
    }
    this.position();
  }.bind(this));
};
