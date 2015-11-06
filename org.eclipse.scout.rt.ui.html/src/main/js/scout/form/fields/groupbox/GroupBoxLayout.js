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
scout.GroupBoxLayout = function(groupBox) {
  scout.GroupBoxLayout.parent.call(this);
  this._groupBox = groupBox;
  this._statusWidth = scout.HtmlEnvironment.fieldStatusWidth;

  // The maximum width for the group box body (null = no max. width)
  this.maxContentWidth = null;
};
scout.inherits(scout.GroupBoxLayout, scout.AbstractLayout);

scout.GroupBoxLayout.prototype.layout = function($container) {
  var titleMarginX, menuBarSize, gbBodySize,
    pseudoStatusWidth = 0,
    htmlContainer = scout.HtmlComponent.get($container),
    htmlGbBody = this._htmlGbBody(),
    htmlMenuBar = this._htmlMenuBar(),
    $groupBoxTitle = this._groupBox._$groupBoxTitle,
    $pseudoStatus = this._groupBox.$pseudoStatus,
    containerSize = htmlContainer.getAvailableSize()
    .subtract(htmlContainer.getInsets());

  if ($pseudoStatus.isVisible()) {
    $pseudoStatus.cssWidth(this._statusWidth);
    pseudoStatusWidth = $pseudoStatus.outerWidth(true);
  }

  if (htmlMenuBar) {
    menuBarSize = scout.MenuBarLayout.size(htmlMenuBar, containerSize);
    if (!this._groupBox.mainBox) {
      // adjust size of menubar as well if it is in a regular group box
      menuBarSize.width -= pseudoStatusWidth;
    }
    htmlMenuBar.setSize(menuBarSize);
  } else {
    menuBarSize = new scout.Dimension(0, 0);
  }

  gbBodySize = containerSize.subtract(htmlGbBody.getMargins());
  gbBodySize.height -= this._titleHeight();
  gbBodySize.height -= menuBarSize.height;

  if (pseudoStatusWidth > 0) {
    titleMarginX = $groupBoxTitle.cssMarginX() + pseudoStatusWidth;
    $groupBoxTitle.css('width', 'calc(100% - ' + titleMarginX + 'px');
  }

  // When max. content width should be enforced, add a padding to the group box body
  // if necessary (to make sure, scrollbar position is not changed)
  if (this.maxContentWidth > 0) {
    // Reset padding-right manually set by layout
    htmlGbBody.$comp.css('padding-right', '');
    // Measure current padding-right (by CSS)
    var cssPaddingRight = htmlGbBody.$comp.cssPxValue('padding-right');
    // Calculate difference between current body with and max. width
    var oldWidth = gbBodySize.width;
    var newWidth = Math.min(gbBodySize.width, this.maxContentWidth);
    var diff = oldWidth - newWidth;
    if (diff > cssPaddingRight) {
      htmlGbBody.$comp.css('padding-right', diff);
    }
  }

  $.log.trace('(GroupBoxLayout#layout) gbBodySize=' + gbBodySize);
  htmlGbBody.setSize(gbBodySize);

  if (htmlGbBody.scrollable) {
    scout.scrollbars.update(htmlGbBody.$comp);
  }
};

scout.GroupBoxLayout.prototype.preferredLayoutSize = function($container) {
  var htmlContainer = scout.HtmlComponent.get($container),
    htmlGbBody = this._htmlGbBody(),
    htmlMenuBar,
    prefSize;

  if (this._groupBox.expanded) {
    prefSize = htmlGbBody.getPreferredSize()
      .add(htmlGbBody.getMargins());

    htmlMenuBar = this._htmlMenuBar();
    if (htmlMenuBar) {
      prefSize.height += htmlMenuBar.getPreferredSize(true).height;
    }
  } else {
    prefSize = new scout.Dimension(0, 0);
  }
  prefSize = prefSize.add(htmlContainer.getInsets());
  prefSize.height += this._titleHeight();

  // predefined height or width in pixel override other values
  if (this._groupBox.gridData && this._groupBox.gridData.widthInPixel) {
    prefSize.width = this._groupBox.gridData.widthInPixel;
  }
  if (this._groupBox.gridData && this._groupBox.gridData.heightInPixel) {
    prefSize.height = this._groupBox.gridData.heightInPixel;
  }

  return prefSize;
};

scout.GroupBoxLayout.prototype._titleHeight = function() {
  return scout.graphics.prefSize(this._groupBox._$groupBoxTitle, true).height;
};

/**
 * Return menu-bar when it exists and it is visible.
 */
scout.GroupBoxLayout.prototype._htmlMenuBar = function() {
  if (this._groupBox.menuBar) {
    var htmlMenuBar = scout.HtmlComponent.get(this._groupBox.menuBar.$container);
    if (htmlMenuBar.isVisible()) {
      return htmlMenuBar;
    }
  }
  return null;
};

scout.GroupBoxLayout.prototype._htmlGbBody = function() {
  return scout.HtmlComponent.get(this._groupBox.$body);
};
