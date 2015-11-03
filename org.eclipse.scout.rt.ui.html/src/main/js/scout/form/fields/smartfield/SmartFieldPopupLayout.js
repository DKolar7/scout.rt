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
/**
 * The popup layout is different from other layouts, since it can determine its own size
 * when the autoSize flag is set to true. Otherwise it uses the given size, like a regular
 * layout. The autoSize feature is used, when a child of the SmartFieldPopupLayout invalidates the
 * tree up to the popup. Since the popup is a validate root it must re-layout itself.
 * However: the size of the popup dependes on the field it belongs to.
 *
 *  The proposal-chooser DIV is not always present.
 */
scout.SmartFieldPopupLayout = function(popup) {
  scout.SmartFieldPopupLayout.parent.call(this);
  this.popup = popup;
};
scout.inherits(scout.SmartFieldPopupLayout, scout.PopupLayout);

scout.SmartFieldPopupLayout.prototype.layout = function($container) {
  var size, prefSize, popupSize,
    htmlProposalChooser = this._htmlProposalChooser($container);

  scout.SmartFieldPopupLayout.parent.prototype.layout.call(this, $container);

  popupSize = this.popup.htmlComp.getSize();
  if (htmlProposalChooser) {
    size = popupSize.subtract(this.popup.htmlComp.getInsets());
    htmlProposalChooser.setSize(size);
  }
  // Reposition because opening direction may have to be switched if popup gets bigger
  // Don't do it the first time (will be done by popup.open), only if the popup is already open and gets layouted again
  if (this.popup.htmlComp.layouted) {
    this.popup.position();
  }
};

/**
 * @override AbstractLayout.js
 */
scout.SmartFieldPopupLayout.prototype.preferredLayoutSize = function($container) {
  var prefSize,
    htmlProposalChooser = this._htmlProposalChooser($container),
    fieldBounds = this.popup._field._fieldBounds();

  if (htmlProposalChooser) {
    prefSize = htmlProposalChooser.getPreferredSize();
  } else {
    prefSize = new scout.Dimension(
      scout.HtmlEnvironment.formColumnWidth,
      scout.HtmlEnvironment.formRowHeight * 2);
  }

  prefSize.width = Math.max(fieldBounds.width, prefSize.width);
  prefSize.height = Math.min(350, prefSize.height);

  // hack, remove double selection border
  return prefSize.add(new scout.Insets(0, 0, -1, 0));
};

scout.SmartFieldPopupLayout.prototype._htmlProposalChooser = function($container) {
  return scout.HtmlComponent.optGet($container.children('.proposal-chooser'));
};
