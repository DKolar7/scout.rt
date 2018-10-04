/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.PopupLayout = function(popup) {
  scout.PopupLayout.parent.call(this);
  this.popup = popup;
  this.doubleCalcPrefSize = true; // enables popups with a height which depends on the width (= popups with wrapping content)
};
scout.inherits(scout.PopupLayout, scout.AbstractLayout);

scout.PopupLayout.prototype.layout = function($container) {
  var htmlComp = this.popup.htmlComp,
    prefSize = this.preferredLayoutSize($container, {
      exact: true
    });

  prefSize = this.adjustSize(prefSize);
  if (this.doubleCalcPrefSize) {
    prefSize = this.preferredLayoutSize($container, {
      exact: true,
      widthHint: prefSize.width - htmlComp.insets().horizontal()
    });
    prefSize = this.adjustSize(prefSize);
  }

  scout.graphics.setSize(htmlComp.$comp, prefSize);
};

scout.PopupLayout.prototype.adjustSize = function(prefSize) {
  // Consider CSS min/max rules
  this.popup.htmlComp._adjustPrefSizeWithMinMaxSize(prefSize);

  // Consider window boundaries
  if (this.popup.boundToAnchor && (this.popup.anchorBounds || this.popup.$anchor)) {
    return this._adjustSizeWithAnchor(prefSize);
  }
  return this._adjustSize(prefSize);
};

scout.PopupLayout.prototype._adjustSize = function(prefSize) {
  var popupSize = new scout.Dimension(),
    maxSize = this._calcMaxSize();

  // Ensure the popup is not larger than max size
  popupSize.width = Math.min(maxSize.width, prefSize.width);
  popupSize.height = Math.min(maxSize.height, prefSize.height);

  return popupSize;
};

/**
 * Considers window boundaries.
 *
 * @returns {scout.Dimension}
 */
scout.PopupLayout.prototype._calcMaxSize = function() {
  // Position the popup at the desired location before doing any calculations to consider the preferred bounds
  this.popup.position(false);

  var maxWidth, maxHeight,
    htmlComp = this.popup.htmlComp,
    windowPaddingX = this.popup.windowPaddingX,
    windowPaddingY = this.popup.windowPaddingY,
    popupMargins = htmlComp.margins(),
    popupPosition = htmlComp.location(),
    windowSize = this.popup.getWindowSize();

  maxWidth = (windowSize.width - popupMargins.horizontal() - popupPosition.x - windowPaddingX);
  maxHeight = (windowSize.height - popupMargins.vertical() - popupPosition.y - windowPaddingY);

  return new scout.Dimension(maxWidth, maxHeight);
};

scout.PopupLayout.prototype._adjustSizeWithAnchor = function(prefSize) {
  var popupSize = new scout.Dimension(),
    maxSize = this._calcMaxSizeAroundAnchor(),
    Alignment = scout.Popup.Alignment,
    horizontalAlignment = this.popup.horizontalAlignment,
    verticalAlignment = this.popup.verticalAlignment;

  // Compared to $comp.height() and width(), $comp.offset() may return fractional values. This means the maxSizes may be fractional as well.
  // The popup sizes must be integers, otherwise reading the height/width later on might result in wrong calculations.
  // This is especially important for the position calculation.
  // Popup.position() uses popup.overlap(), if the popup height is lets say 90.5, overlapY would be 0.5 because height returned 91
  // -> the popup switches its direction unnecessarily
  maxSize = maxSize.floor();

  // Decide whether the prefSize can be used or the popup needs to be shrinked so that it fits into the viewport
  // The decision is based on the preferred opening direction
  // Example: The popup would like to be opened right and down
  // If there is enough space on the right and on the bottom -> pref size is used
  // If there is not enough space on the right it checks whether there is enough space on the left
  // If there is enough space on the left -> use preferred width -> The opening direction will be switched using position() at the end
  // If there is not enough space on the left as well, the greater width is used -> Position() will either switch the direction or not, depending on the size of the popup
  // The same happens for y direction if there is not enough space on the bottom
  popupSize.width = prefSize.width;
  if (this.popup.trimWidth) {
    if (this.popup.horizontalSwitch) {
      if (prefSize.width > maxSize.right && prefSize.width > maxSize.left) {
        popupSize.width = Math.max(maxSize.right, maxSize.left);
      }
    } else {
      if (horizontalAlignment === Alignment.RIGHT) {
        popupSize.width = Math.min(popupSize.width, maxSize.right);
      } else if (horizontalAlignment === Alignment.LEFT) {
        popupSize.width = Math.min(popupSize.width, maxSize.left);
      }
    }
  }
  popupSize.height = prefSize.height;
  if (this.popup.trimHeight) {
    if (this.popup.verticalSwitch) {
      if (prefSize.height > maxSize.bottom && prefSize.height > maxSize.top) {
        popupSize.height = Math.max(maxSize.bottom, maxSize.top);
      }
    } else {
      if (verticalAlignment === Alignment.BOTTOM) {
        popupSize.height = Math.min(popupSize.height, maxSize.bottom);
      } else if (verticalAlignment === Alignment.TOP) {
        popupSize.height = Math.min(popupSize.height, maxSize.top);
      }
    }
  }

  // On CENTER alignment, the anchor must ne be considered. Instead make sure the popup does not exceed window boundaries (same as in adjustSize)
  if (verticalAlignment === Alignment.CENTER || horizontalAlignment === Alignment.CENTER) {
    var windowSize = this._calcMaxSize();
    if (horizontalAlignment === Alignment.CENTER) {
      popupSize.width = Math.min(windowSize.width, prefSize.width);
    }
    if (verticalAlignment === Alignment.CENTER) {
      popupSize.height = Math.min(windowSize.height, prefSize.height);
    }
  }

  return popupSize;
};

/**
 * Considers window boundaries.
 *
 * @returns {scout.Dimension}
 */
scout.PopupLayout.prototype._calcMaxSizeAroundAnchor = function() {
  // Position the popup at the desired location before doing any calculations because positioning adds CSS classes which might change margins
  this.popup.position(false);

  var maxWidthLeft, maxWidthRight, maxHeightDown, maxHeightUp,
    htmlComp = this.popup.htmlComp,
    windowPaddingX = this.popup.windowPaddingX,
    windowPaddingY = this.popup.windowPaddingY,
    popupMargins = htmlComp.margins(),
    anchorBounds = this.popup.getAnchorBounds(),
    windowSize = this.popup.getWindowSize();

  maxWidthRight = (windowSize.width - (anchorBounds.x + anchorBounds.width) - popupMargins.horizontal() - windowPaddingX);
  maxWidthLeft = (anchorBounds.x - popupMargins.horizontal() - windowPaddingX);
  maxHeightDown = (windowSize.height - (anchorBounds.y + anchorBounds.height) - popupMargins.vertical() - windowPaddingY);
  maxHeightUp = (anchorBounds.y - popupMargins.vertical() - windowPaddingY);

  return new scout.Insets(maxHeightUp, maxWidthRight, maxHeightDown, maxWidthLeft);
};
