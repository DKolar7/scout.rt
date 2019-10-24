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
scout.IconColumn = function() {
  scout.IconColumn.parent.call(this);
  this.minWidth = scout.Column.NARROW_MIN_WIDTH;
  this.filterType = 'ColumnUserFilter';
  this.textBased = false;
};
scout.inherits(scout.IconColumn, scout.Column);

/**
 * @override
 */
scout.IconColumn.prototype._initCell = function(cell) {
  scout.IconColumn.parent.prototype._initCell.call(this, cell);
  // only display icon, no text
  cell.text = null;
  cell.iconId = cell.value || cell.iconId;
  return cell;
};

/**
 * @override
 */
scout.IconColumn.prototype._formatValue = function(value) {
  // only display icon, no text
  return null;
};

/**
 * @override
 */
scout.IconColumn.prototype._cellCssClass = function(cell, tableNode) {
  var cssClass = scout.IconColumn.parent.prototype._cellCssClass.call(this, cell, tableNode);
  cssClass += ' table-icon-cell';
  return cssClass;
};

/**
 * @override
 */
scout.IconColumn.prototype.cellTextForGrouping = function(row) {
  var cell = this.table.cell(this, row);
  return cell.value;
};

scout.IconColumn.prototype.createAggrGroupCell = function(row) {
  var cell = scout.IconColumn.parent.prototype.createAggrGroupCell.call(this, row);
  // Make sure only icon and no text is displayed
  cell.text = null;
  return cell;
};
