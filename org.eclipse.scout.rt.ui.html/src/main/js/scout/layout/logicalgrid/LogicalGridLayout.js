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
/**
 * JavaScript port of org.eclipse.scout.rt.ui.swing.LogicalGridLayout.
 *
 * @param options available options: hgap, vgap, rowHeight, columnWidth, minWidthInPixel
 *
 */
scout.LogicalGridLayout = function(widget, options) {
  scout.LogicalGridLayout.parent.call(this);
  this.cssClass = 'logical-grid-layout';
  this.validityBasedOnContainerSize = new scout.Dimension();
  this.valid = false;
  this.widget = widget;
  this.info = null;
  this.hgap = 0;
  this.vgap = 0;
  this.rowHeight = scout.HtmlEnvironment.formRowHeight;
  this.columnWidth = scout.HtmlEnvironment.formColumnWidth;
  this.minWidthInPixel = 0;
  $.extend(this, options);
};
scout.inherits(scout.LogicalGridLayout, scout.AbstractLayout);

scout.LogicalGridLayout.prototype._verifyLayout = function($container) {
  var htmlContainer = scout.HtmlComponent.get($container),
    containerSize = htmlContainer.size();

  if (!this.valid || !this.validityBasedOnContainerSize.equals(containerSize)) {
    this.validityBasedOnContainerSize = containerSize;
    this.validateLayout($container);
    this.valid = true;
  }
};

/**
 * @override
 */
scout.LogicalGridLayout.prototype.invalidate = function() {
  this.valid = false;
};

scout.LogicalGridLayout.prototype.validateLayout = function($container) {
  var visibleComps = [], visibleCons = [], cons;

  this.widget.validateLogicalGrid();

  $container.children().each(function (idx, elem) {
    var $comp = $(elem);
    var htmlComp = scout.HtmlComponent.optGet($comp);
    if (!htmlComp) {
      return;
    }
    var widget = $comp.data('widget');
    // Prefer the visibility state of the widget, if there is one.
    // This allows for transitions, because the $component may still be in the process of being made invisible
    var visible = widget ? widget.isVisible() : $comp.isVisible();
    if (visible) {
      visibleComps.push($comp);
      cons = htmlComp.layoutData;
      cons.validate();
      visibleCons.push(cons);
    }
  });
  this.info = new scout.LogicalGridLayoutInfo({
    $components: visibleComps,
    cons: visibleCons,
    hgap: this.hgap,
    vgap: this.vgap,
    rowHeight: this.rowHeight,
    columnWidth: this.columnWidth
  });
  if ($.log.isTraceEnabled()) {
    $.log.trace('(LogicalGridLayout#validateLayout) $container=' + scout.HtmlComponent.get($container).debug());
  }
};

scout.LogicalGridLayout.prototype.layout = function($container) {
  this._layout($container);
};

scout.LogicalGridLayout.prototype._layout = function($container) {
  this._verifyLayout($container);
  var htmlContainer = scout.HtmlComponent.get($container),
    containerSize = htmlContainer.availableSize(),
    containerInsets = htmlContainer.insets();
  if (this.minWidthInPixel > 0 && containerSize.width < this.minWidthInPixel) {
    containerSize.width = this.minWidthInPixel;
  }
  if ($.log.isTraceEnabled()) {
    $.log.trace('(LogicalGridLayout#layout) container ' + htmlContainer.debug() + ' size=' + containerSize + ' insets=' + containerInsets);
  }
  var cellBounds = this.info.layoutCellBounds(containerSize, containerInsets);

  // Set bounds of components
  var r1, r2, r, d, $comp, i, htmlComp, data, delta, margins;
  for (i = 0; i < this.info.$components.length; i++) {
    $comp = this.info.$components[i];
    htmlComp = scout.HtmlComponent.get($comp);
    data = this.info.gridDatas[i];
    r1 = cellBounds[data.gridy][data.gridx];
    r2 = cellBounds[data.gridy + data.gridh - 1][data.gridx + data.gridw - 1];
    r = r1.union(r2);
    if (data.topInset > 0) {
      r.y += data.topInset;
      r.height -= data.topInset;
    }
    margins = htmlComp.margins();
    r.width -= margins.horizontal();
    r.height -= margins.vertical();
    if (data.fillHorizontal && data.fillVertical) {
      // ok
    } else {
      d = this.info.compSize[i];
      if (!data.fillHorizontal && d.width < r.width) {
        delta = r.width - d.width;
        r.width = d.width;
        if (data.horizontalAlignment === 0) {
          // Do ceil the result as other layout managers of Java also handle floating calculation results that way.
          // This is important if being used in conjunction with another layout manager.
          // E.g. the editable checkbox in inline table cell is a JCheckBox and rendered by LogicalGridLayout,
          // whereas the default boolean representation in a table cell is simply an image on a label positioned by
          // default layout manager. If switching in between of edit and non-edit mode, the widget would bounce otherwise.
          r.x += Math.ceil(delta / 2.0);
        } else if (data.horizontalAlignment > 0) {
          r.x += delta;
        }
      }
      if (!data.fillVertical && d.height < r.height) {
        delta = r.height - d.height;
        if (data.heightHint === 0) {
          r.height = d.height;
        } else {
          r.height = data.heightHint;
        }
        if (data.verticalAlignment === 0) {
          // Do ceil the result as other layout managers of Java also handle floating calculation results that way.
          // This is important if being used in conjunction with another layout manager.
          // E.g. the editable checkbox in inline table cell is a JCheckBox and rendered by LogicalGridLayout,
          // whereas the default boolean representation in a table cell is simply an image on a label positioned by
          // default layout manager. If switching in between of edit and non-edit mode, the widget would bounce otherwise.
          r.y += Math.ceil(delta / 2.0);
        } else if (data.verticalAlignment > 0) {
          r.y += delta;
        }
      }
    }
    if ($.log.isTraceEnabled()) {
      $.log.trace('(LogicalGridLayout#layout) comp=' + htmlComp.debug() + ' bounds=' + r);
    }
    htmlComp.setBounds(r);
  }
};

scout.LogicalGridLayout.prototype.preferredLayoutSize = function($container) {
  return this.getLayoutSize($container, scout.LayoutConstants.PREF);
};

scout.LogicalGridLayout.prototype.getLayoutSize = function($container, sizeflag) {
  this._verifyLayout($container);
  var dim = new scout.Dimension();
  // w
  var i, w, h, useCount = 0;
  for (i = 0; i < this.info.cols; i++) {
    w = this.info.width[i][sizeflag];
    if (useCount > 0) {
      dim.width += this.hgap;
    }
    dim.width += w;
    useCount++;
  }
  // h
  useCount = 0;
  for (i = 0; i < this.info.rows; i++) {
    h = this.info.height[i][sizeflag];
    if (useCount > 0) {
      dim.height += this.vgap;
    }
    dim.height += h;
    useCount++;
  }
  // insets
  var insets = scout.HtmlComponent.get($container).insets();
  dim.width += insets.horizontal();
  dim.height += insets.vertical();
  return dim;
};
