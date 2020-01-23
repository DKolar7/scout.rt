/*******************************************************************************
 * Copyright (c) 2014-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.DesktopHeader = function() {
  scout.DesktopHeader.parent.call(this);
  this.tabArea;
  this._desktopPropertyChangeHandler = this._onDesktopPropertyChange.bind(this);
  this._desktopAnimationEndHandler = this._onDesktopAnimationEnd.bind(this);
  this._outlineContentMenuBarPropertyChangeHandler = this._onOutlineContentMenuBarPropertyChange.bind(this);
  this._viewButtonBoxPropertyChangeHandler = this._onViewButtonBoxPropertyChange.bind(this);
};
scout.inherits(scout.DesktopHeader, scout.Widget);

scout.DesktopHeader.prototype._init = function(model) {
  scout.DesktopHeader.parent.prototype._init.call(this, model);
  this.desktop = this.session.desktop;
  this.toolBoxVisible = scout.nvl(model.toolBoxVisible, true);
  this.viewButtonBoxVisible = scout.nvl(model.viewButtonBoxVisible, false);
  this.updateViewButtonBoxVisibility();
  // create view tab box
  this.tabArea = scout.create('SimpleTabArea', {
    parent: this
  });
};

scout.DesktopHeader.prototype._render = function() {
  this.$container = this.$parent.appendDiv('desktop-header');
  this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
  this.htmlComp.setLayout(new scout.DesktopHeaderLayout(this));
  this._renderViewButtonBoxVisible();
  this._renderViewTabs();
  this._renderToolBoxVisible();
  this._renderLogoUrl();
  this._renderInBackground();
  this.desktop.on('propertyChange', this._desktopPropertyChangeHandler);
  this.desktop.on('animationEnd', this._desktopAnimationEndHandler);
  if (this.desktop.bench) {
    this.outlineContent = this.desktop.bench.outlineContent;
  }
  this._attachOutlineContentMenuBarHandler();
};

scout.DesktopHeader.prototype._remove = function() {
  this.desktop.off('propertyChange', this._desktopPropertyChangeHandler);
  this.desktop.off('animationEnd', this._desktopAnimationEndHandler);
  this._detachOutlineContentMenuBarHandler();
  this.outlineContent = null;
  scout.DesktopHeader.parent.prototype._remove.call(this);
};

scout.DesktopHeader.prototype._renderViewTabs = function() {
  this.tabArea.render();
};

scout.DesktopHeader.prototype._renderToolBox = function() {
  if (this.toolBox) {
    return;
  }
  this.toolBox = scout.create('DesktopToolBox', {
    parent: this,
    menus: this.desktop.menus
  });
  this.toolBox.render();
};

scout.DesktopHeader.prototype._removeToolBox = function() {
  if (!this.toolBox) {
    return;
  }
  this.toolBox.destroy();
  this.toolBox = null;
};

scout.DesktopHeader.prototype._renderToolBoxVisible = function() {
  if (this.toolBoxVisible) {
    this._renderToolBox();
  } else {
    this._removeToolBox();
  }
  this.invalidateLayoutTree();
};

scout.DesktopHeader.prototype._renderLogoUrl = function() {
  if (this.logoUrl) {
    this._renderLogo();
  } else {
    this._removeLogo();
  }
  this.invalidateLayoutTree();
};

scout.DesktopHeader.prototype._renderLogo = function() {
  if (!this.logo) {
    this.logo = scout.create('DesktopLogo', {
      parent: this,
      url: this.logoUrl,
      desktop: this.desktop
    });
    this.logo.render();
  } else {
    this.logo.setUrl(this.logoUrl);
  }
};

scout.DesktopHeader.prototype._removeLogo = function() {
  if (!this.logo) {
    return;
  }
  this.logo.destroy();
  this.logo = null;
};

scout.DesktopHeader.prototype._renderViewButtonBox = function() {
  if (this.viewButtonBox) {
    return;
  }
  this.viewButtonBox = scout.create('ViewButtonBox', {
    parent: this,
    viewButtons: this.desktop.viewButtons
  });
  this.viewButtonBox.on('propertyChange', this._viewButtonBoxPropertyChangeHandler);
  this.viewButtonBox.render();
  this.viewButtonBox.$container.prependTo(this.$container);
  if (this.desktop.inBackground) {
    this.viewButtonBox.sendToBack();
  }
  this.updateViewButtonStyling();
};

scout.DesktopHeader.prototype._removeViewButtonBox = function() {
  if (!this.viewButtonBox) {
    return;
  }
  this.viewButtonBox.off('propertyChange', this._viewButtonBoxPropertyChangeHandler);
  this.viewButtonBox.destroy();
  this.viewButtonBox = null;
};

scout.DesktopHeader.prototype._renderViewButtonBoxVisible = function() {
  if (this.viewButtonBoxVisible) {
    this._renderViewButtonBox();
  } else {
    this._removeViewButtonBox();
  }
  this.invalidateLayoutTree();
};

scout.DesktopHeader.prototype.sendToBack = function() {
  if (this.viewButtonBox) {
    this.viewButtonBox.sendToBack();
  }
  if (this.rendered) {
    this._renderInBackground();
  }
};

scout.DesktopHeader.prototype.bringToFront = function() {
  if (this.viewButtonBox) {
    this.viewButtonBox.bringToFront();
  }
  if (this.rendered) {
    this._renderInBackground();
  }
};

scout.DesktopHeader.prototype._renderInBackground = function() {
  this.$container.toggleClass('in-background', this.desktop.inBackground);
};

scout.DesktopHeader.prototype.setLogoUrl = function(logoUrl) {
  this.setProperty('logoUrl', logoUrl);
};

scout.DesktopHeader.prototype.setToolBoxVisible = function(visible) {
  this.setProperty('toolBoxVisible', visible);
};

scout.DesktopHeader.prototype.setViewButtonBoxVisible = function(visible) {
  this.setProperty('viewButtonBoxVisible', visible);
};

scout.DesktopHeader.prototype.setMenus = function(menus) {
  if (this.toolBox) {
    this.toolBox.setMenus(menus);
  }
};

scout.DesktopHeader.prototype.updateViewButtonBoxVisibility = function() {
  // View buttons are visible in the header if the navigation is not visible
  // If there are no view buttons at all, don't show the box
  // With displayStyle is set to compact, the view buttons should never be visible in the header
  this.setViewButtonBoxVisible(this.desktop.viewButtons.length > 0 && !this.desktop.navigationVisible && this.desktop.displayStyle !== scout.Desktop.DisplayStyle.COMPACT);
};

scout.DesktopHeader.prototype._attachOutlineContentMenuBarHandler = function() {
  if (!this.outlineContent) {
    return;
  }
  var menuBar = this._outlineContentMenuBar(this.outlineContent);
  if (menuBar) {
    menuBar.on('propertyChange', this._outlineContentMenuBarPropertyChangeHandler);
  }
};

scout.DesktopHeader.prototype._detachOutlineContentMenuBarHandler = function() {
  if (!this.outlineContent) {
    return;
  }
  var menuBar = this._outlineContentMenuBar(this.outlineContent);
  if (menuBar) {
    menuBar.off('propertyChange', this._outlineContentMenuBarPropertyChangeHandler);
  }
};

scout.DesktopHeader.prototype._outlineContentMenuBar = function(outlineContent) {
  if (outlineContent instanceof scout.Form) {
    return outlineContent.rootGroupBox.menuBar;
  }
  return outlineContent.menuBar;
};

scout.DesktopHeader.prototype.updateViewButtonStyling = function() {
  if (!this.viewButtonBoxVisible || !this.desktop.bench || !this.desktop.bench.outlineContentVisible) {
    return;
  }
  var outlineContent = this.desktop.bench.outlineContent;
  if (!outlineContent) {
    // Outline content not available yet (-> needs to be loaded first)
    return;
  }
  var hasMenuBar = false;
  if (outlineContent instanceof scout.Form && outlineContent.detailForm) {
    var rootGroupBox = outlineContent.rootGroupBox;
    hasMenuBar = rootGroupBox.menuBar && rootGroupBox.menuBarVisible && rootGroupBox.menuBar.visible;
  } else {
    hasMenuBar = outlineContent.menuBar && outlineContent.menuBar.visible;
  }
  this.$container.toggleClass('outline-content-has-menubar', !!hasMenuBar);
};

scout.DesktopHeader.prototype._onDesktopNavigationVisibleChange = function(event) {
  // If navigation gets visible: Hide view buttons immediately
  // If navigation gets hidden using animation: Show view buttons when animation ends
  if (this.desktop.navigationVisible) {
    this.updateViewButtonBoxVisibility();
  }
};

scout.DesktopHeader.prototype._onDesktopAnimationEnd = function(event) {
  this.updateViewButtonBoxVisibility();
};

scout.DesktopHeader.prototype.onBenchOutlineContentChange = function(content) {
  this._detachOutlineContentMenuBarHandler();
  this.outlineContent = content;
  this.updateViewButtonStyling();
  this._attachOutlineContentMenuBarHandler();
};

scout.DesktopHeader.prototype._onDesktopPropertyChange = function(event) {
  if (event.propertyName === 'navigationVisible') {
    this._onDesktopNavigationVisibleChange();
  }
};

scout.DesktopHeader.prototype._onOutlineContentMenuBarPropertyChange = function(event) {
  if (event.propertyName === 'visible') {
    this.updateViewButtonStyling();
  }
};

scout.DesktopHeader.prototype._onViewButtonBoxPropertyChange = function(event) {
  if (event.propertyName === 'menuButtons' || event.propertyName === 'tabButtons') {
    this.invalidateLayoutTree();
  }
};
