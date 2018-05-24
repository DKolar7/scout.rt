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
scout.PageLayout = function(outline, page) {
  scout.PageLayout.parent.call(this);
  this.outline = outline;
  this.page = page;
};
scout.inherits(scout.PageLayout, scout.AbstractLayout);

scout.PageLayout.prototype.layout = function($container) {
  var containerSize, detailMenuBarSize,
    htmlContainer = this.page.htmlComp,
    $text = this.page.$text,
    $icon = this.page.$icon(),
    titleHeight = 0,
    iconHeight = 0,
    nodeMenuBar = this.outline.nodeMenuBar,
    nodeMenuBarPrefSize = 0,
    detailMenuBar = this.outline.detailMenuBar,
    detailMenuBarHeight = 0;

  containerSize = htmlContainer.availableSize()
    .subtract(htmlContainer.insets());

  if (nodeMenuBar.visible) {
    nodeMenuBarPrefSize = nodeMenuBar.htmlComp.prefSize();
    nodeMenuBar.htmlComp.setSize(nodeMenuBarPrefSize);
    $text.cssWidth(containerSize.width - nodeMenuBarPrefSize.add(nodeMenuBar.htmlComp.margins()).width);
  }

  if (detailMenuBar.visible) {
    detailMenuBarHeight = detailMenuBar.htmlComp.prefSize().height;
    detailMenuBarSize = new scout.Dimension(containerSize.width, detailMenuBarHeight)
      .subtract(detailMenuBar.htmlComp.margins());
    detailMenuBar.htmlComp.setSize(detailMenuBarSize);
  }

  if (this.outline.detailContent) {
    if ($icon.length > 0) {
      iconHeight = $icon.outerHeight(true);
    }
    titleHeight = Math.max($text.outerHeight(true), iconHeight);
    this.outline.detailContent.htmlComp.setSize(new scout.Dimension(containerSize.width, containerSize.height - titleHeight - detailMenuBarHeight));
  }
};

scout.PageLayout.prototype.preferredLayoutSize = function($container) {
  var prefSize, containerSize, textHeight,
    iconHeight = 0,
    htmlContainer = this.page.htmlComp,
    detailContentPrefSize = new scout.Dimension(),
    $text = this.page.$text,
    $icon = this.page.$icon(),
    titlePrefHeight = 0,
    detailMenuBar = this.outline.detailMenuBar,
    detailMenuBarPrefSize = new scout.Dimension(),
    nodeMenuBar = this.outline.nodeMenuBar,
    nodeMenuBarWidth = 0;

  containerSize = htmlContainer.size()
    .subtract(htmlContainer.insets());

  if (nodeMenuBar.visible && nodeMenuBar.rendered) {
    nodeMenuBarWidth = nodeMenuBar.htmlComp.prefSize().width;
  }

  // needs a width to be able to calculate the pref height -> container width needs to be correct already
  textHeight = scout.graphics.prefSize($text, {
    includeMargin: true,
    widthHint: containerSize.width - nodeMenuBarWidth
  }).height;

  if ($icon.length > 0) {
    iconHeight = $icon.outerHeight(true);
  }
  titlePrefHeight = Math.max(textHeight, iconHeight);

  if (detailMenuBar.visible && detailMenuBar.rendered) {
    detailMenuBarPrefSize = detailMenuBar.htmlComp.prefSize();
  }
  if (this.outline.detailContent) {
    // Table row detail may contain wrapped text as well, but since it uses the full width there is no need to give a width hint
    detailContentPrefSize = this.outline.detailContent.htmlComp.prefSize();
  }

  prefSize = new scout.Dimension(Math.max(detailContentPrefSize.width, detailMenuBarPrefSize.width), titlePrefHeight + detailMenuBarPrefSize.height + detailContentPrefSize.height);
  prefSize = prefSize.add(htmlContainer.insets());
  return prefSize;
};
