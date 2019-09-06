/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
/**
 * Composite keystroke to provide a numeric keystroke to select view tabs.
 */
scout.DesktopTabSelectKeyStroke = function(desktop) {
  scout.DesktopTabSelectKeyStroke.parent.call(this);
  this.field = desktop;

  // modifier
  this.parseAndSetKeyStroke(desktop.selectViewTabsKeyStrokeModifier);

  // range [1..9]
  this.registerRange(
    scout.keys['1'], // range from
    function() {
      return scout.keys[Math.min(this._viewTabs().length, 9)]; // range to
    }.bind(this)
  );

  // rendering hints
  this.renderingHints.hAlign = scout.HAlign.RIGHT;
  this.renderingHints.$drawingArea = function($drawingArea, event) {
    var viewIndex = event.which - scout.keys['1'];
    return this._viewTabs()[viewIndex].$container;
  }.bind(this);
};
scout.inherits(scout.DesktopTabSelectKeyStroke, scout.RangeKeyStroke);

/**
 * @override KeyStroke.js
 */
scout.DesktopTabSelectKeyStroke.prototype._isEnabled = function() {
  var enabled = scout.DesktopTabSelectKeyStroke.parent.prototype._isEnabled.call(this);
  return enabled && this.field.selectViewTabsKeyStrokesEnabled && this._viewTabs().length > 0;
};

/**
 * @override KeyStroke.js
 */
scout.DesktopTabSelectKeyStroke.prototype.handle = function(event) {
  var viewIndex = event.which - scout.keys['1'];

  if (this._viewTabs().length && (viewIndex < this._viewTabs().length)) {
    var viewTab = this._viewTabs()[viewIndex];
    if (this.field.bench) {
      this.field.bench.activateView(viewTab.view);
    }
  }
};

scout.DesktopTabSelectKeyStroke.prototype._viewTabs = function() {
  if (this.field.bench) {
    return this.field.bench.getTabs();
  }
  return [];
};
