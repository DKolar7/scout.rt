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
scout.DatePickerTouchPopupLayout = function(popup) {
  scout.DatePickerTouchPopupLayout.parent.call(this, popup);
};
scout.inherits(scout.DatePickerTouchPopupLayout, scout.TouchPopupLayout);

/**
 * @override
 */
scout.DatePickerTouchPopupLayout.prototype.preferredLayoutSize = function($container, options) {
  var popupWidth = scout.htmlEnvironment.formColumnWidth,
    containerInsets = this.popup.htmlComp.insets(),
    fieldHtmlComp = this.popup._field.htmlComp,
    widgetContainerHtmlComp = this.popup._widgetContainerHtmlComp,
    fieldPrefSize = fieldHtmlComp.prefSize(options)
    .add(fieldHtmlComp.margins()),
    widgetContainerPrefSize = widgetContainerHtmlComp.prefSize(options)
    .add(widgetContainerHtmlComp.margins()),
    headerHeight = scout.graphics.size(this.popup._$header, true).height,
    popupHeight = headerHeight + fieldPrefSize.height + widgetContainerPrefSize.height + containerInsets.vertical();

  return new scout.Dimension(popupWidth, popupHeight);
};
