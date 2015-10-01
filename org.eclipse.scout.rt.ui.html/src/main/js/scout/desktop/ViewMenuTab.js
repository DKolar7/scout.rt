/**
 * Shows a list of view buttons with displayStyle=MENU
 * and shows the title of the active outline, if the outline is one
 * of the outline-view-buttons contained in the menu.
 */
scout.ViewMenuTab = function(viewMenus, session) {
  this.viewMenus = viewMenus;
  this.session = session;

  this.$container;
  this.$title;
  this.$menuButton;

  this.outlineViewButton = null;
  this.selected = false;
  this.text;
  this.iconId;
  this._inBackground = false;
  this._breadcrumbEnabled = false;

  this._update();
};

/**
 * 1. look for a selected outline-view-button
 * 2. look for any outline-view-button
 * 3. in rare cases there will be no outline-view-button at all
 */
scout.ViewMenuTab.prototype._update = function() {
  var ovb = this._findOutlineViewButton(true);
  if (ovb) {
    this.selected = true;
  } else {
    ovb = this._findOutlineViewButton(false);
    this.selected = false;
  }
  this.outlineViewButton = ovb;

  if (this.outlineViewButton) {
    this.text = this.outlineViewButton.text;
    this.iconId = this.outlineViewButton.getIconId();
  } else {
    this.text = this.session.text('ui.Outlines');
    this.iconId = scout.icons.OUTLINE;
  }
};

scout.ViewMenuTab.prototype.render = function($parent) {
  this.$container = $parent.appendDiv('view-button-tab')
    .unfocusable()
    .on('mousedown', this.togglePopup.bind(this))
    .data('tooltipText', function() {
      return this.text;
    }.bind(this));
  this.$title = this.$container
    .appendSpan('view-button-tab-title has-menu')
    .icon(this.iconId);
  this.$menuButton = this.$container
    .appendSpan('view-menu-button')
    .on('mousedown', this.togglePopup.bind(this));
  this._renderProperties();
};

scout.ViewMenuTab.prototype._renderProperties = function() {
  this._renderText();
  this._renderIconId();
  this._renderSelected();
};

scout.ViewMenuTab.prototype._renderText = function() {
  if (this._breadcrumbEnabled || this.selected) {
    this.$title.css('display', 'none'); // reset to CSS default ('none')
  } else {
    this.$title.css('display', 'inline-block');
    this.$title.text(this.selected ? this.text : '');
  }
  this._updateMenuButtonVisibility();
};

scout.ViewMenuTab.prototype._renderSelected = function() {
  this.$container.select(this.selected);
  this._updateMenuButtonVisibility();
  if (this.selected && !this._breadcrumbEnabled) {
    scout.tooltips.uninstall(this.$container);
  } else {
    scout.tooltips.install(this.$container, {
      parent: this.session.desktop,
      text: this.text
    });
  }
};

scout.ViewMenuTab.prototype._renderIconId = function() {
  this.$container.icon(this.iconId);
};

scout.ViewMenuTab.prototype._updateMenuButtonVisibility = function() {
  this.$menuButton.setVisible(this.selected && !this._inBackground);
};

/**
 * @param onlySelected when false -> function returns the first viewMenu which is an OutlineViewButton
 *                     when true  -> function returns the first viewMenu which is an OutlineViewButton AND also selected
 */
scout.ViewMenuTab.prototype._findOutlineViewButton = function(onlySelected) {
  var viewMenu;
  for (var i = 0; i < this.viewMenus.length; i++) {
    viewMenu = this.viewMenus[i];
    if (viewMenu instanceof scout.OutlineViewButton) {
      if (!onlySelected ||
        onlySelected && viewMenu.selected) {
        return viewMenu;
      }
    }
  }
  return null;
};

/**
 * Toggles the 'view menu popup', or brings the outline content to the front if in background.
 */
scout.ViewMenuTab.prototype.togglePopup = function(event) {
  if (this.selected) {
    if (this._inBackground) {
      this.session.desktop.bringOutlineToFront(this.outlineViewButton.outline);
    } else {
      // Open or close the popup.
      if (this.popup) {
        this.popup.close(event);
      } else {
        this.popup = this._openPopup(event);
        this.popup.on('remove', function(event) {
          this.popup = null;
        }.bind(this));
      }
      return false; // menu won't open if we didn't abort the mousedown-event
    }
  } else {
    this.outlineViewButton.doAction();
  }
};

scout.ViewMenuTab.prototype._openPopup = function() {
  var naviBounds = scout.graphics.bounds(this.$container.parent(), true);
  var popup = scout.create(scout.ViewMenuPopup, {
    parent: this.session.desktop,
    $tab: this.$container,
    viewMenus: this._popupViewMenus(),
    naviBounds: naviBounds,
    breadcrumbEnabled: this._breadcrumbEnabled
  });
  popup.headText = this.text;
  popup.render();
  return popup;
};

/**
 * An OutlineViewButton for a null-outline shouldn't be added to the menus
 * displayed in the popup-menu. We recognize the null-outline be checking
 * the 'visibleInMenu' property.
 */
scout.ViewMenuTab.prototype._popupViewMenus = function() {
  var i, popupMenus = [];
  this.viewMenus.forEach(function(viewMenu) {
    if (scout.helpers.nvl(viewMenu.visibleInMenu, true)) {
      popupMenus.push(viewMenu);
    }
  });
  return popupMenus;
};

scout.ViewMenuTab.prototype.onOutlineChanged = function(outline) {
  var i, viewMenu, ovb = null;
  for (i = 0; i < this.viewMenus.length; i++) {
    viewMenu = this.viewMenus[i];
    if (viewMenu instanceof scout.OutlineViewButton && viewMenu.outline === outline) {
      ovb = viewMenu;
      break;
    }
  }

  if (ovb) {
    this.selected = true;
    this.text = ovb.text;
    this.iconId = ovb.getIconId();
    this.outlineViewButton = ovb;
  } else {
    this.selected = false;
  }

  this._renderProperties();
};

scout.ViewMenuTab.prototype.sendToBack = function() {
  this._inBackground = true;
  this._renderSelected();
};

scout.ViewMenuTab.prototype.bringToFront = function() {
  this._inBackground = false;
  this._renderSelected();
};

scout.ViewMenuTab.prototype.setBreadcrumbEnabled = function(enabled) {
  this._breadcrumbEnabled = enabled;
  this._renderText();
  this._renderSelected();
};
