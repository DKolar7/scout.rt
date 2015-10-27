// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.AggregateTableControl = function() {
  scout.AggregateTableControl.parent.call(this);
  this._tableDataScrollHandler = this._onTableDataScroll.bind(this);
  this._tableRowsDrawnHandler = this._onTableRowsDrawn.bind(this);
  this._tableRowsFilteredHandler = this._onTableRowsFiltered.bind(this);
  this._tableRowsSelectedHandler = this._onTableRowsSelected.bind(this);
  this._tableColumnResizedHandler = this._onTableColumnResized.bind(this);
  this._tableColumnStructureChangedHandler = this._onTableColumnStructureChanged.bind(this);
  this._tableAggregationFunctionHandler = this._onTableAggregationFunctionChanged.bind(this);
  this.cssClass = 'aggregate';
  this.height = 42;
  this.resizerVisible = false;
  this.aggregateRow;
};
scout.inherits(scout.AggregateTableControl, scout.TableControl);

scout.AggregateTableControl.prototype._init = function(model) {
  scout.AggregateTableControl.parent.prototype._init.call(this, model);

  this._updateEnabledAndSelectedState();
  this.table.on('columnStructureChanged', this._tableColumnStructureChangedHandler);
};

scout.AggregateTableControl.prototype.destroy = function() {
  scout.AggregateTableControl.parent.prototype.destroy.call(this);

  this.table.off('columnStructureChanged', this._tableColumnStructureChangedHandler);
};

scout.AggregateTableControl.prototype._renderContent = function($parent) {
  this.$contentContainer = $parent.appendDiv('table-aggregate');

  this._aggregate();
  this._renderAggregate();
  this._reconcileScrollPos();

  this.table.$data.on('scroll', this._tableDataScrollHandler);
  this.table.on('rowsDrawn', this._tableRowsDrawnHandler);
  this.table.on('rowsFiltered', this._tableRowsFilteredHandler);
  this.table.on('rowsSelected', this._tableRowsSelectedHandler);
  this.table.on('columnResized', this._tableColumnResizedHandler);
  this.table.on('aggregationFunctionChanged', this._tableAggregationFunctionHandler);
};

scout.AggregateTableControl.prototype._removeContent = function() {
  this.$contentContainer.remove();

  this.table.$data.off('scroll', this._tableDataScrollHandler);
  this.table.off('rowsDrawn', this._tableRowsDrawnHandler);
  this.table.off('rowsFiltered', this._tableRowsFilteredHandler);
  this.table.off('rowsSelected', this._tableRowsSelectedHandler);
  this.table.off('columnResized', this._tableColumnResizedHandler);
  this.table.off('aggregationFunctionChanged', this._tableAggregationFunctionHandler);
};

scout.AggregateTableControl.prototype._renderAggregate = function() {
  this.table.columns.forEach(function(column, c) {
    var aggregateValue, decimalFormat, cell, $cell;

    aggregateValue = this.aggregateRow[c];
    if (aggregateValue === undefined || aggregateValue === null) {
      cell = {
        empty: true
      };
    } else {
      if (column.format) {
        decimalFormat = new scout.DecimalFormat(this.session.locale, column.format);
        aggregateValue = decimalFormat.format(aggregateValue);
      }
      cell = {
        text: aggregateValue,
        iconId: column.aggrSymbol,
        horizontalAlignment: column.horizontalAlignment,
        cssClass: 'table-aggregate-cell'
      };
    }

    $cell = $(column.buildCell(cell, {}));

    // If aggregation is based on the selection and not on all rows -> mark it
    if (this.aggregateRow.selection) {
      $cell.addClass('selection');
    }

    $cell.appendTo(this.$contentContainer);
  }, this);

  if (this.aggregateRow.selection) {
    this.$contentContainer.addClass('selection');
  }
};

scout.AggregateTableControl.prototype._rerenderAggregate = function() {
  this.$contentContainer.empty();
  this._renderAggregate();
};

scout.AggregateTableControl.prototype._aggregate = function() {
  var value, rows,
    columns = this.table.columns,
    aggregateRow = [],
    selectedRows = this.table.selectedRows;

  if (selectedRows.length > 1) {
    rows = selectedRows;
    aggregateRow.selection = true;
  } else {
    rows = this.table.filteredRows();
  }

  var prepare = function(column, c) {
    if (column.type === 'number') {
      aggregateRow[c] = column.aggrStart();
    }
  };

  var aggregateFunc = function(row, column, c) {
    if (column.type === 'number') {
      value = this.table.cellValue(column, row);
      aggregateRow[c] = column.aggrStep(aggregateRow[c], value);
    }
  };

  var finish = function(column, c) {
    if (column.type === 'number') {
      aggregateRow[c] = column.aggrFinish(aggregateRow[c]);
    }
  };

  columns.forEach(prepare);

  rows.forEach(function(row, r) {
    columns.forEach(aggregateFunc.bind(this, row));
  }.bind(this));

  columns.forEach(finish);

  this.aggregateRow = aggregateRow;
};

scout.AggregateTableControl.prototype._reconcileScrollPos = function() {
  // When scrolling horizontally scroll aggregate content as well
  var scrollLeft = this.table.$data.scrollLeft();
  this.$contentContainer.scrollLeft(scrollLeft);
};

/**
 * Ignores the model value and set enabled based on columns.<p>
 *
 */
scout.AggregateTableControl.prototype._computeEnabled = function() {
  var containsNumberColumn = this.table.columns.some(function(column) {
    return column.type === 'number';
  });
  return containsNumberColumn;
};

scout.AggregateTableControl.prototype._updateEnabledAndSelectedState = function() {
  this.setEnabled(this._computeEnabled());

  // Make sure a disabled control is not selected
  if (!this.enabled && this.selected) {
    this.setSelected(false);
  }
};

scout.AggregateTableControl.prototype.setEnabled = function(enabled) {
  this.enabled = enabled;
  if (this.rendered) {
    this._renderEnabled();
  }
};

scout.AggregateTableControl.prototype.isContentAvailable = function() {
  return true;
};

scout.AggregateTableControl.prototype._syncEnabled = function(enabled) {
  this.enabled = enabled;
  this._updateEnabledAndSelectedState();
};

scout.AggregateTableControl.prototype._syncSelected = function(selected) {
  this.selected = selected;
  this._updateEnabledAndSelectedState();
};

scout.AggregateTableControl.prototype._onTableDataScroll = function() {
  this._reconcileScrollPos();
};

scout.AggregateTableControl.prototype._onTableRowsDrawn = function(event) {
  this._aggregate();
  this._rerenderAggregate();
};

scout.AggregateTableControl.prototype._onTableRowsFiltered = function(event) {
  this._aggregate();
  this._rerenderAggregate();
};

scout.AggregateTableControl.prototype._onTableRowsSelected = function(event) {
  this._aggregate();
  this._rerenderAggregate();
};

scout.AggregateTableControl.prototype._onTableColumnResized = function(event) {
  this._rerenderAggregate();
};

scout.AggregateTableControl.prototype._onTableColumnStructureChanged = function(event) {
  this._updateEnabledAndSelectedState();
  if (this.selected && this.rendered) {
    this._aggregate();
    this._rerenderAggregate();
  }
};

scout.AggregateTableControl.prototype._onTableAggregationFunctionChanged = function(event) {
  this._aggregate();
  this._rerenderAggregate();
};
