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
scout.DesktopTab = function() {
  scout.DesktopTab.parent.call(this);

  this.view;

  this._propertyChangeListener = function(event) {
    if (scout.arrays.containsAny(event.changedProperties, ['title'])) {
      this.setTitle(this.view.title);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['subTitle'])) {
      this.setSubTitle(this.view.subTitle);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['iconId'])) {
      this.setIconId(this.view.iconId);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['cssClass'])) {
      this.setCssClass(event.newProperties.cssClass);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['saveNeeded'])) {
      this.setSaveNeeded(event.newProperties.saveNeeded);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['saveNeededVisible'])) {
      this.setSaveNeededVisible(event.newProperties.saveNeededVisible);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['closable'])) {
      this.setClosable(event.newProperties.closable);
    }
    if (scout.arrays.containsAny(event.changedProperties, ['status'])) {
      this.setStatus(event.source.status);
    }
  }.bind(this);
  this._removeListener = this._onViewRemoved.bind(this);
};

scout.inherits(scout.DesktopTab, scout.SimpleTab);

scout.DesktopTab.prototype._init = function(options) {
  this.view = options.view;
  options.title = this.view.title;
  options.subTitle = this.view.subTitle;
  options.iconId = this.view.iconId;
  options.closable = this.view.closable;
  options.saveNeeded = this.view.saveNeeded;
  options.saveNeededVisible = this.view.saveNeededVisible;
  options.status = this.view.status;
  options.cssClass = this.view.cssClass;

  scout.DesktopTab.parent.prototype._init.call(this, options);
  this._installListeners();
};

scout.DesktopTab.prototype._installListeners = function() {
  this.view.on('propertyChange', this._propertyChangeListener);
  this.view.on('remove', this._removeListener);
};

scout.DesktopTab.prototype._uninstallListeners = function() {
  this.view.off('propertyChange', this._propertyChangeListener);
  this.view.off('remove', this._removeListener);
};

scout.DesktopTab.prototype._cssClassUpdated = function(cssClass, oldCssClass) {
  if (!this.$container) {
    return;
  }
  this.$container.removeClass(oldCssClass);
  this.$container.addClass(cssClass);
};

scout.DesktopTab.prototype._onClose = function() {
  this.view.close();
};

/**
 * We cannot not bind the 'remove' event of the view to the remove function
 * of the this tab, because in bench-mode the tab is never rendered
 * and thus the _remove function is never called.
 */
scout.DesktopTab.prototype._onViewRemoved = function() {
  this._uninstallListeners();
  if (this.rendered) {
    this.remove();
  } else {
    this.trigger('remove');
  }
};
