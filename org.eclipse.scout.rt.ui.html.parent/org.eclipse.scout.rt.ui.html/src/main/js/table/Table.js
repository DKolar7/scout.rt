// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.Table = function() {
  scout.Table.parent.call(this);
  this.$container;
  this.$data;
  this._$scrollable;
  this.header;
  this.selectionHandler;
  this.keystrokeAdapter;
  this.columns = [];
  this.tableControls = [];
  this.menus = [];
  this.rows = [];
  this.staticMenus = [];
  this._addAdapterProperties(['tableControls', 'menus']);
  this.events = new scout.EventSupport();
  this.selectionHandler = new scout.TableSelectionHandler(this);
  this._filterMap = {};
  this.selectedRowIds = [];
  this.animationRowLimit = 25;
  this.menuBar;
};
scout.inherits(scout.Table, scout.ModelAdapter);

scout.Table.GUI_EVENT_ROWS_DRAWN = 'rowsDrawn';
scout.Table.GUI_EVENT_ROWS_SELECTED = 'rowsSelected';
scout.Table.GUI_EVENT_ROWS_FILTERED = 'rowsFiltered';
scout.Table.GUI_EVENT_FILTER_RESETTED = 'filterResetted';

scout.Table.prototype.init = function(model, session) {
  scout.Table.parent.prototype.init.call(this, model, session);
  this.keystrokeAdapter = new scout.TableKeystrokeAdapter(this);
  for (var i = 0; i < this.columns.length; i++) {
    this.columns[i].index = i;
  }
};

scout.Table.prototype._render = function($parent) {
  var i, layout;

  this._$parent = $parent;
  this.$container = this._$parent.appendDiv('table');
  layout = new scout.TableLayout(this);
  this.htmlComp = new scout.HtmlComponent(this.$container, this.session);
  this.htmlComp.setLayout(layout);
  this.htmlComp.pixelBasedSizing = false;

  if (!scout.keystrokeManager.isAdapterInstalled(this.keystrokeAdapter)) {
    this.$container.attr('tabIndex', 0);
    scout.keystrokeManager.installAdapter(this.$container, this.keystrokeAdapter);
  }

  this.$data = this.$container.appendDiv('table-data');
  this._$scrollable = scout.scrollbars.install(this.$data);

  this.menuBar = new scout.MenuBar(this.$container, 'top', scout.TableMenuItemsOrder.order);

  this._totalWidth = 0;
  for (i = 0; i < this.columns.length; i++) {
    this._totalWidth += this.columns[i].width;
  }

  this.drawData();
};

scout.Table.prototype._renderProperties = function() {
  this._renderEnabled(this.enabled);
  this._renderTableHeader();
  this._renderTableFooter();
};

scout.Table.prototype._remove = function() {
  scout.Table.parent.prototype._remove.call(this);
  this.header = null;
  this.footer = null;
};

// FIXME AWE: refactor all _render* methods --> remove parameter, always use this.*
// reason: the property on this is already synced at this point, the argument may contain
// just a data-model value (and not a adpater).
scout.Table.prototype._renderTableControls = function(dummy) {
 this._renderTableFooter();
};

scout.Table.prototype._renderTableStatusVisible = function(dummy) {
 this._renderTableFooter();
};

scout.Table.prototype._isFooterVisible = function() {
  return this.tableStatusVisible || this.tableControls.length > 0;
};

scout.Table.prototype._createHeader = function() {
  return new scout.TableHeader(this, this.session);
};

scout.Table.prototype._createFooter = function() {
  return new scout.TableFooter(this);
};

scout.Table.prototype.remove = function() {
  scout.Table.parent.prototype.remove.call(this);
  this.menuBar.remove();
};

scout.Table.prototype.dispose = function() {
  scout.keystrokeManager.uninstallAdapter(this.keystrokeAdapter);
};

scout.Table.prototype.clearSelection = function() {
  this.selectionHandler.clearSelection();
};

scout.Table.prototype.toggleSelection = function() {
  this.selectionHandler.toggleSelection();
};

scout.Table.prototype.updateScrollbar = function() {
  scout.scrollbars.update(this._$scrollable);
};

scout.Table.prototype._sort = function() {
  var column, sortIndex,
    sortColumns = [];

  // find all sort columns
  for (var c = 0; c < this.columns.length; c++) {
    column = this.columns[c];
    sortIndex = column.sortIndex;
    if (sortIndex >= 0) {
      sortColumns[sortIndex] = column;
    }
  }

  // Initialize comparators
  var clientSideSortingPossible = this._prepareColumnsForSorting(sortColumns);
  if (!clientSideSortingPossible) {
    return false;
  }

  // compare rows
  function compare(row1, row2) {
    for (var s = 0; s < sortColumns.length; s++) {
      column = sortColumns[s];
      var valueA = this.getCellValue(column, row1);
      var valueB = this.getCellValue(column, row2);
      var direction = column.sortActive && column.sortAscending ? -1 : 1;

      var result = column.compare(valueA, valueB);
      if (result < 0) {
        return direction;
      } else if (result > 0) {
        return -1 * direction;
      }
    }

    return 0;
  }
  this.rows.sort(compare.bind(this));

  //Sort was possible -> return true
  return true;
};

scout.Table.prototype._prepareColumnsForSorting = function(sortColumns) {
  var collator, column;

  var textComparator = function(valueA, valueB) {
    return collator.compare(valueA, valueB);
  };

  var defaultComparator = function(valueA, valueB) {
    if (valueA < valueB) {
      return -1;
    } else if (valueA > valueB) {
      return 1;
    }
    return 0;
  };

  // initialize comparators
  for (var c = 0; c < sortColumns.length; c++) {
    column = sortColumns[c];
    if (column.type === 'text') {
      if (!scout.device.supportsInternationalization()) {
        //Locale comparison not possible -> do it on server
        return false;
      }

      if (!collator) {
        collator = new window.Intl.Collator(this.session.locale.languageTag);
      }
      column.compare = textComparator;
    } else {
      column.compare = defaultComparator;
    }
  }

  return true;
};

scout.Table.prototype._renderRowOrderChanges = function() {
  var $row, oldTop, i, rowWasInserted, animate, that = this;
  var $rows = this.$rows();
  var $sortedRows = $();

  //store old position
  if ($rows.length < that.animationRowLimit) {
    $rows.each(function() {
      $row = $(this);

      //Prevent the order animation for newly inserted rows (to not confuse the user)
      rowWasInserted = false;
      for (var i in that._insertedRows) {
        if (that._insertedRows[i].id === $row.attr('id')) {
          rowWasInserted = true;
          break;
        }
      }

      if (!rowWasInserted) {
        animate = true;
        $row.data('old-top', $row.offset().top);
      }
    });
  }

  for (i = 0; i < this.rows.length; i++) {
    $row = this.$rowById(this.rows[i].id);
    $sortedRows.push($row[0]);
  }

  // change order in dom
  this._$scrollable.prepend($sortedRows);

  // for less than animationRowLimit rows: move to old position and then animate
  if (animate) {
    $rows.each(function() {
      $row = $(this);
      oldTop = $row.data('old-top');
      if (oldTop !== undefined) {
        $row.css('top', oldTop - $row.offset().top)
          .animateAVCSD('top', 0);
      }
    });
  }
};

/**
 * @param additional true to add the column to list of sorted columns. False to use this column exclusively as sort column (reset other columns)
 */
scout.Table.prototype.sort = function($header, dir, additional, remove) {
  var sortIndex, siblingsResetted,
    maxIndex = -1,
    column = $header.data('column'),
    data = {
      columnId: column.id
    };

  // Update model
  if (remove) {
    data.sortingRemoved = true;
    column.sortActive = false;

    //Adjust sibling columns with higher index
    scout.arrays.eachSibling(this.columns, column, function(siblingColumn) {
      if (siblingColumn.sortIndex > column.sortIndex) {
        siblingColumn.sortIndex = siblingColumn.sortIndex - 1;
      }
    });
    column.sortIndex = undefined;
  } else {
    if (additional) {
      data.multiSort = true;

      // If not already sorted set the appropriate sort index
      if (!column.sortActive) {
        for (var i = 0; i < this.columns.length; i++) {
          sortIndex = this.columns[i].sortIndex;
          if (sortIndex >= 0) {
            maxIndex = Math.max(sortIndex, maxIndex);
          }
        }
        column.sortIndex = maxIndex + 1;
      }
    } else {
      scout.arrays.eachSibling(this.columns, column, function(siblingColumn) {
        if (siblingColumn.sortActive) {
          siblingColumn.sortIndex = undefined;
          siblingColumn.sortActive = false;
          siblingsResetted = true;
        }
      });
      column.sortIndex = 0;
    }
    if (column.sortActive && siblingsResetted) {
      //FIXME CGU this is necessary because the server logic does it (handleSortEvent). In my opinion we have to send sorting details (active, index, asc) instead of just column sorted.
      column.sortAscending = true;
    } else {
      column.sortAscending = dir === 'asc' ? true : false;
    }
    column.sortActive = true;
  }

  this.header.onSortingChanged();

  // sort model
  var sorted = this._sort();
  if (sorted) {
    this.session.send(this.id, 'rowsSorted', data);

    this.clearSelection();
    this._renderRowOrderChanges();
  } else {
    //Delegate sorting to server when it is not possible on client side
    this.session.send(this.id, 'sortRows', data);
  }
};

scout.Table.prototype.drawData = function() {
  this.$rows().remove();
  this._drawData(0);
  this.selectionHandler.dataDrawn();
};

scout.Table.prototype._buildRowDiv = function(row) {
  var column, style, value, tooltipText, tooltip;
  var rowWidth = this._totalWidth + this._tableRowBorderWidth();
  var rowClass = 'table-row ';
  if (this.selectedRowIds && this.selectedRowIds.indexOf(row.id) > -1) {
    rowClass += 'selected ';
  }

  var rowDiv = '<div id="' + row.id + '" class="' + rowClass + '" style="width: ' + rowWidth + 'px"' + scout.device.unselectableAttribute + '>';
  for (var c = 0; c < this.columns.length; c++) {
    column = this.columns[c];
    style = this.getCellStyle(column, row);
    value = this.getCellText(column, row);
    tooltipText = this.getCellTooltipText(column, row);
    tooltip = (!scout.strings.hasText(tooltipText) ? '' : ' title="' + tooltipText + '"');

    rowDiv += '<div class="table-cell" style="' + style + '"' + tooltip + scout.device.unselectableAttribute + '>' + value + '</div>';
  }
  rowDiv += '</div>';

  return rowDiv;
};

scout.Table.prototype._tableRowBorderWidth = function() {
  if (this._tablRowBorderWidth !== undefined) {
    return this._tablRowBorderWidth;
  }

  var $tableRowDummy = this._$scrollable.appendDiv('table-row');
  this._tablRowBorderWidth = $tableRowDummy.cssBorderLeftWidth() + $tableRowDummy.cssBorderRightWidth();
  $tableRowDummy.remove();
  return this._tablRowBorderWidth;
};

scout.Table.prototype._drawData = function(startRow) {
  // this function has to be fast
  var rowString = '',
    that = this,
    numRowsLoaded = startRow,
    $rows,
    $mouseDownRow;

  if (this.rows.length > 0) {
    for (var r = startRow; r < Math.min(this.rows.length, startRow + 100); r++) {
      var row = this.rows[r];
      rowString += this._buildRowDiv(row, r);
    }
    numRowsLoaded = r;

    // append block of rows
    $rows = $(rowString);
    $rows.appendTo(this._$scrollable)
      .on('mousedown', '', onMouseDown)
      .on('mouseup', '', onMouseUp)
      .on('dblclick', '', onDoubleClick)
      .on('contextmenu', onContextMenu); //mouseup is used instead of click to make sure the event is fired before mouseup in table selection handler
  }

  // update info and scrollbar
  this._triggerRowsDrawn($rows, numRowsLoaded);
  this.updateScrollbar();

  // repaint and append next block
  if (this.rows.length > numRowsLoaded) {
    setTimeout(function() {
      that._drawData(startRow + 100);
    }, 0);
  }

  function onContextMenu(event) {
    event.preventDefault();

    var $selectedRows = that.$selectedRows(),
      x = event.pageX,
      y = event.pageY;

    if ($selectedRows.length > 0) {
      waitForServer(that.session, showMenuPopup);
    }

    /* TODO AWE/CGU: (scout, menu) try to get rid of aboutToShow, than delete this method
     * or move to a better suited location if we cannot remove it. Reason: with the new UI
     * menu-items are added to the menu-bar. There, all items are visible from the start.
     * So there's no point in time where it makes sense to execute the aboutToShow() method
     * which was called when a context menu was about to open. As a replacement for aboutTo
     * Show we could use a listener to enabled/disable menu-items.
     *
     * When aboutToShow is deleted, we can simplify the code here. waitForServer is no longer
     * needed.
     */
    function waitForServer(session, func) {
      if (session.offline) {
        // don't show context menus in offline mode, they won't work
        return;
      }
      if (session.areRequestsPending() || session.areEventsQueued()) {
        session.listen().done(func);
      } else {
        func();
      }
    }

    function showMenuPopup() {
      var menuItems = that._filterMenus($selectedRows);
      if (menuItems.length > 0) {
        var popup = new scout.Popup();
        popup.render();
        scout.menus.appendMenuItems(popup, menuItems);
        popup.setLocation(new scout.Point(x, y));
      }
    }
  }

  function onMouseDown(event) {
    $mouseDownRow = $(event.delegateTarget);
  }

  function onMouseUp(event) {
    if (event.originalEvent.detail > 1) {
      //don't execute on double click events
      return;
    }

    var $mouseUpRow = $(event.delegateTarget);
    if ($mouseDownRow && $mouseDownRow[0] !== $mouseUpRow[0]) {
      return;
    }

    var $row = $(event.delegateTarget);
    //Send click only if mouseDown and mouseUp happened on the same row
    that.session.send(that.id, 'rowClicked', {
      rowId: $row.attr('id')
    });
  }

  function onDoubleClick(event) {
    var $row = $(event.delegateTarget);
    that.sendRowAction($row);
  }

};

scout.Table.prototype._filterMenus = function($selectedRows, allowedTypes) {
  allowedTypes = allowedTypes || [];
  if ($selectedRows && $selectedRows.length === 1) {
    allowedTypes.push('Table.SingleSelection');
  } else if ($selectedRows && $selectedRows.length > 1) {
    allowedTypes.push('Table.MultiSelection');
  }
  return scout.menus.filter(this.menus, allowedTypes);
};

scout.Table.prototype._renderMenus = function(menus) {
  this._renderRowMenus(this.$selectedRows());
};

scout.Table.prototype._renderRowMenus = function($selectedRows) {
  var menuItems = this._filterMenus($selectedRows, ['Table.EmptySpace', 'Table.Header']);
  menuItems = this.staticMenus.concat(menuItems);
  this.menuBar.updateItems(menuItems);
};

scout.Table.prototype.onRowsSelected = function($selectedRows) {
  var rowIds = [];

  this.triggerRowsSelected($selectedRows);
  this._renderRowMenus($selectedRows);

  if ($selectedRows) {
    $selectedRows.each(function() {
      rowIds.push($(this).attr('id'));
    });
  }

  if (!scout.arrays.equalsIgnoreOrder(rowIds, this.selectedRowIds)) {
    this.selectedRowIds = rowIds;
    if (!this.session.processingEvents) {
      this.session.send(this.id, 'rowsSelected', {
        rowIds: rowIds
      });
    }
  }
};

scout.Table.prototype.onResize = function() {
  if (this.footer) {
    this.footer.onResize();
  }
};

scout.Table.prototype.sendRowAction = function($row) {
  this.session.send(this.id, 'rowAction', {
    rowId: $row.attr('id')
  });
};

scout.Table.prototype.sendReload = function() {
  this.session.send(this.id, 'reload');
};

scout.Table.prototype.getCellValue = function(column, row) {
  var cell = row.cells[column.index];

  if (cell === null) { //cell may be a number so don't use !cell
    return null;
  }
  if (typeof cell !== 'object') {
    return cell;
  }
  if (cell.value !== undefined) {
    return cell.value;
  }
  return cell.text || '';
};

scout.Table.prototype.getCellText = function(column, row) {
  var cell = row.cells[column.index];

  if (!cell) {
    return '';
  }
  if (typeof cell !== 'object') {
    return cell;
  }
  return cell.text || '';
};

scout.Table.prototype.getCellStyle = function(column, row) {
  var cell = row.cells[column.index];

  var width = column.width;
  if (width === 0) {
    return 'display: none;';
  }
  var style = 'min-width: ' + width + 'px; max-width: ' + width + 'px; ';

  var hAlign = scout.Table.parseHorizontalAlignment(column.horizontalAlignment);
  if (typeof cell === 'object' && cell !== null) {
    if (cell.horizontalAlignment) {
      hAlign = scout.Table.parseHorizontalAlignment(cell.horizontalAlignment);
    }
    if (cell.foregroundColor) {
      style += 'color: #' + cell.foregroundColor + '; ';
    }
    if (cell.backgroundColor) {
      style += 'background-color: #' + cell.backgroundColor + '; ';
    }
    if (cell.font) {
      var fontSpec = scout.helpers.parseFontSpec(cell.font);
      if (fontSpec.bold) {
        style += 'font-weight: bold; ';
      }
      if (fontSpec.italic) {
        style += 'font-style: italic; ';
      }
      if (fontSpec.size) {
        style += 'font-size: ' + fontSpec.size + 'pt; ';
      }
      if (fontSpec.name) {
        style += 'font-family: ' + fontSpec.name + '; ';
      }
    }
    // TODO BSH Table | iconId, editable, errorStatus
  }
  style += (hAlign === 'left' ? '' : 'text-align: ' + hAlign + '; ');
  return style;
};

scout.Table.prototype.getCellTooltipText = function(column, row) {
  var cell = row.cells[column.index];
  if (typeof cell === 'object' && cell !== null && scout.strings.hasText(cell.tooltipText)) {
    return cell.tooltipText;
  }
  return '';
};

scout.Table.prototype._group = function() {
  var that = this,
    all, groupColumn, column, alignment,
    $group = $('.group-sort', this.$container);

  // remove all sum rows
  this.$sumRows().animateAVCSD('height', 0, $.removeThis, that.updateScrollbar.bind(that));

  // find group type
  if ($('.group-all', this.$container).length) {
    all = true;
  } else if ($group.length) {
    groupColumn = $group.data('column');
  } else {
    return;
  }

  // prepare data
  var $rows = $('.table-row:visible', this._$scrollable),
    $sumRow = $.makeDiv('table-row-sum'),
    sum = [];

  for (var r = 0; r < $rows.length; r++) {
    var rowId = $rows.eq(r).attr('id');
    // FIXME CGU is it possible to link row to $row? because table.rowById does a lookup
    var row = this.rowById(rowId);

    // calculate sum per column
    for (var c = 0; c < this.columns.length; c++) {
      column = this.columns[c];
      var value = this.getCellValue(column, row);

      if (column.type === 'number') {
        sum[c] = (sum[c] || 0) + value;
      }
    }

    // test if sum should be shown, if yes: reset sum-array
    var nextRowId = $rows.eq(r + 1).attr('id');
    var nextRow = this.rowById(nextRowId);

    if ((r === $rows.length - 1) || (!all && this.getCellText(groupColumn, row) !== this.getCellText(groupColumn, nextRow)) && sum.length > 0) {
      for (c = 0; c < this.columns.length; c++) {
        var $cell;

        column = this.columns[c];
        alignment = scout.Table.parseHorizontalAlignment(column.horizontalAlignment);
        if (typeof sum[c] === 'number') {
          $cell = $.makeDiv('table-cell', sum[c])
            .css('text-align', alignment);
        } else if (!all && column === groupColumn) {
          $cell = $.makeDiv('table-cell', this.getCellText(groupColumn, row))
            .css('text-align', alignment);
        } else {
          $cell = $.makeDiv('table-cell', '&nbsp');
        }

        $cell.appendTo($sumRow)
          .css('min-width', column.width)
          .css('max-width', column.width);
      }

      // TODO BSH Table Sum | There is something wrong here...
      $sumRow.insertAfter($rows.eq(r))
        .width(this._totalWidth + this._tableRowBorderWidth())
        .hide()
        .slideDown();

      $sumRow = $.makeDiv('table-row-sum');
      sum = [];
    }
  }
};

scout.Table.prototype.group = function($header, draw, all) {
  $('.group-sort', this.$container).removeClass('group-sort');
  $('.group-all', this.$container).removeClass('group-all');

  if (draw) {
    if (!all) {
      this.sort($header, 'asc', false);
    }
    this.header.onGroupingChanged($header, all);
  }

  this._group();
};

scout.Table.prototype.colorData = function(mode, colorColumn) {
  var minValue, maxValue, colorFunc, row, rowId, value, v, c, $rows;

  for (var r = 0; r < this.rows.length; r++) {
    row = this.rows[r];
    v = this.getCellValue(colorColumn, row);

    if (v < minValue || minValue === undefined) {
      minValue = v;
    }
    if (v > maxValue || maxValue === undefined) {
      maxValue = v;
    }
  }

  // TODO CRU Don't use hardcoded colors (or make them customizable)
  // TODO CRU Handle case where model already has set specific cell background colors
  if (mode === 'red') {
    colorFunc = function(cell, value) {
      var level = (value - minValue) / (maxValue - minValue);

      var r = Math.ceil(255 - level * (255 - 171)),
        g = Math.ceil(175 - level * (175 - 214)),
        b = Math.ceil(175 - level * (175 - 147));

      cell.css('background-color', 'rgb(' + r + ',' + g + ', ' + b + ')');
      cell.css('background-image', '');
    };
  } else if (mode === 'green') {
    colorFunc = function(cell, value) {
      var level = (value - minValue) / (maxValue - minValue);

      var r = Math.ceil(171 - level * (171 - 255)),
        g = Math.ceil(214 - level * (214 - 175)),
        b = Math.ceil(147 - level * (147 - 175));

      cell.css('background-color', 'rgb(' + r + ',' + g + ', ' + b + ')');
      cell.css('background-image', '');
    };
  } else if (mode === 'bar') {
    colorFunc = function(cell, value) {
      var level = Math.ceil((value - minValue) / (maxValue - minValue) * 100) + '';

      cell.css('background-color', 'transparent');
      cell.css('background-image', 'linear-gradient(to left, #80c1d0 0%, #80c1d0 ' + level + '%, transparent ' + level + '%, transparent 100% )');
    };
  } else if (mode === 'remove') {
    colorFunc = function(cell, value) {
      cell.css('background-image', '');
      cell.css('background-color', 'transparent');
    };
  }

  $rows = $('.table-row:visible', this._$scrollable);

  $('.header-item', this.$container).each(function(i) {
    if ($(this).data('column') === colorColumn) {
      c = i;
    }
  });

  for (var s = 0; s < $rows.length; s++) {
    rowId = $rows.eq(s).attr('id');
    row = this.rowById(rowId);
    value = this.getCellValue(colorColumn, row);

    colorFunc($rows.eq(s).children().eq(c), value);
  }
};

scout.Table.prototype._onRowsSelected = function(rowIds) {
  this.selectedRowIds = rowIds;

  if (this.rendered) {
    this.selectionHandler.drawSelection();
  }
};

scout.Table.prototype._onRowsInserted = function(rows) {
  //always insert new rows at the end, if the order is wrong a rowOrderChange event will follow
  scout.arrays.pushAll(this.rows, rows);

  if (this.rendered) {
    // Remember inserted rows for future events like rowOrderChanged
    if (!this._insertedRows) {
      this._insertedRows = rows;
      setTimeout(function() {
        this._insertedRows = null;
      }.bind(this), 0);
    } else {
      scout.arrays.pushAll(this._insertedRows, rows);
    }

    this.drawData();
  }
};

scout.Table.prototype._onRowsDeleted = function(rowIds) {
  var rows, $row, i, row;

  //update model
  rows = this.rowsByIds(rowIds);
  for (i = 0; i < rows.length; i++) {
    row = rows[i];
    scout.arrays.remove(this.rows, row);
  }

  //update html doc
  if (this.rendered) {
    for (i = 0; i < rowIds.length; i++) {
      $row = this.$rowById(rowIds[i]);
      $row.remove();
    }
    this.updateScrollbar();
  }
};

scout.Table.prototype._onAllRowsDeleted = function() {
  this.rows = [];

  if (this.rendered) {
    this.drawData();
  }
};

scout.Table.prototype.scrollTo = function($selection) {
  scout.scrollbars.scrollTo(this._$scrollable, $selection);
};

scout.Table.prototype.selectRowsByIds = function(rowIds) {
  if (!scout.arrays.equalsIgnoreOrder(rowIds, this.selectedRowIds)) {
    this.selectedRowIds = rowIds;

    this.session.send(this.id, 'rowsSelected', {
      rowIds: rowIds
    });
  }

  this.selectionHandler.drawSelection();
};

scout.Table.prototype.$selectedRows = function() {
  if (!this._$scrollable) {
    return $();
  }
  return this._$scrollable.find('.selected');
};

scout.Table.prototype.$rows = function(includeSumRows) {
  var selector = '.table-row';
  if (includeSumRows) {
    selector += ', .table-row-sum';
  }
  return this._$scrollable.find(selector);
};

scout.Table.prototype.$sumRows = function() {
  return this._$scrollable.find('.table-row-sum');
};

scout.Table.prototype.$cellsForColIndex = function(colIndex, includeSumRows) {
  var selector = '.table-row > div:nth-of-type(' + colIndex + ' )';
  if (includeSumRows) {
    selector += ', .table-row-sum > div:nth-of-type(' + colIndex + ' )';
  }
  return this._$scrollable.find(selector);
};

scout.Table.prototype.$rowById = function(rowId) {
  return this._$scrollable.find('#' + rowId);
};

scout.Table.prototype.rowById = function(rowId) {
  var row, i;
  for (i = 0; i < this.rows.length; i++) {
    row = this.rows[i];
    if (row.id === rowId) {
      return row;
    }
  }
};

scout.Table.prototype.rowsByIds = function(rowIds) {
  var i, row, rows = [];

  for (i = 0; i < this.rows.length; i++) {
    row = this.rows[i];
    if (rowIds.indexOf(row.id) > -1) {
      rows.push(this.rows[i]);
      if (rows.length === rowIds.length) {
        return rows;
      }
    }
  }
  return rows;
};

scout.Table.prototype.columnById = function(columnId) {
  var column, i;
  for (i = 0; i < this.columns.length; i++) {
    column = this.columns[i];
    if (column.id === columnId) {
      return column;
    }
  }
};

scout.Table.prototype.filter = function() {
  var that = this,
    rowCount = 0,
    $allRows = this.$rows();

  // TODO BSH Table Selection | Selection should be preserved if possible
  that.clearSelection();
  // TODO BSH Table Sum | See also _group(), this does not seem to be too good
  this.$sumRows().hide();

  // Filter rows
  var rowsToHide = [];
  var rowsToShow = [];
  $allRows.each(function() {
    var $row = $(this),
      show = true,
      i;

    for (i = 0; i < that.columns.length; i++) {
      if (that.columns[i].filterFunc) {
        show = show && that.columns[i].filterFunc($row);
      }
    }

    for (var key in that._filterMap) {
      var filter = that._filterMap[key];
      show = show && filter.accept($row);
    }

    if (show) {
      if ($row.hasClass('invisible')) {
        rowsToShow.push($row);
      }
      rowCount++;
    } else {
      if (!$row.hasClass('invisible')) {
        rowsToHide.push($row);
      }
    }
  });

  // Show / hide rows that changed their state during filtering
  var useAnimation = ((rowsToShow.length + rowsToHide.length) <= that.animationRowLimit);
  $(rowsToHide).each(function() {
    that.hideRow($(this), useAnimation);
  });
  $(rowsToShow).each(function() {
    that.showRow($(this), useAnimation);
  });

  //Used by table footer
  this.filteredRowCount = rowCount;

  this._triggerRowsFiltered(rowCount, this.filteredBy());

  $(':animated', that._$scrollable).promise().done(function() {
    that._group();
  });
};

/**
 *
 * @returns array of filter names which are currently active
 */
scout.Table.prototype.filteredBy = function() {
  var filteredBy = [];
  for (var i = 0; i < this.columns.length; i++) {
    if (this.columns[i].filterFunc) {
      filteredBy.push(this.columns[i].$div.text());
    }
  }
  for (var key in this._filterMap) {
    var filter = this._filterMap[key];
    filteredBy.push(filter.label);
  }
  return filteredBy;
};

scout.Table.prototype.resetFilter = function() {
  this.clearSelection();

  // reset rows
  var that = this;
  var $rows = this.$rows();
  $rows.each(function() {
    that.showRow($(this), ($rows.length <= that.animationRowLimit));
  });
  this._group();

  // set back all filter functions
  for (var i = 0; i < this.columns.length; i++) {
    this.columns[i].filter = [];
    this.columns[i].filterFunc = null;
  }
  this._filterMap = {};
  this.filteredRowCount = undefined;
  this._triggerFilterResetted();
};

/**
 * @param filter object with name and accept()
 */
scout.Table.prototype.registerFilter = function(key, filter) {
  if (!key) {
    throw new Error('key has to be defined');
  }

  this._filterMap[key] = filter;
};

scout.Table.prototype.getFilter = function(key, filter) {
  if (!key) {
    throw new Error('key has to be defined');
  }

  return this._filterMap[key];
};

scout.Table.prototype.unregisterFilter = function(key) {
  if (!key) {
    throw new Error('key has to be defined');
  }

  delete this._filterMap[key];
};

scout.Table.prototype.showRow = function($row, useAnimation) {
  var that = this;
  if (!$row.hasClass('invisible')) {
    return;
  }

  if (useAnimation) {
    $row.stop().slideDown({
      duration: 250,
      complete: function() {
        $row.removeClass('invisible');
        that.updateScrollbar();
      }
    });
  }
  else {
    $row.show();
    $row.removeClass('invisible');
    that.updateScrollbar();
  }
};

scout.Table.prototype.hideRow = function($row, useAnimation) {
  var that = this;
  if ($row.hasClass('invisible')) {
    return;
  }

  if (useAnimation) {
    $row.stop().slideUp({
      duration: 250,
      complete: function() {
        $row.addClass('invisible');
        that.updateScrollbar();
      }
    });
  }
  else {
    $row.hide();
    $row.addClass('invisible');
    that.updateScrollbar();
  }
};

/**
 * @param resizingInProgress set this to true when calling this function several times in a row. If resizing is finished you have to call resizingColumnFinished.
 */
scout.Table.prototype.resizeColumn = function($header, width, totalWidth, resizingInProgress) {
  var colNum = this.header.getColumnViewIndex($header) + 1;
  var column = $header.data('column');

  column.width = width;
  this._totalWidth = totalWidth;

  this.$cellsForColIndex(colNum, true)
    .css('min-width', width)
    .css('max-width', width);
  this.$rows(true)
    .css('width', totalWidth);

  this.header.onColumnResized($header, width);

  if (!resizingInProgress) {
    this.resizingColumnFinished($header, width);
  }
};

scout.Table.prototype.resizingColumnFinished = function($header, width) {
  var column = $header.data('column');
  var data = {
    columnId: column.id,
    width: width
  };
  this.session.send(this.id, 'columnResized', data);
};

scout.Table.prototype.moveColumn = function($header, oldPos, newPos, dragged) {
  var column = $header.data('column');

  scout.arrays.remove(this.columns, column);
  scout.arrays.insert(this.columns, column, newPos);

  var data = {
    columnId: column.id,
    index: newPos
  };
  this.session.send(this.id, 'columnMoved', data);

  this.header.onColumnMoved($header, oldPos, newPos, dragged);

  // move cells
  this.$rows(true).each(function() {
    var $cells = $(this).children();
    if (newPos < oldPos) {
      $cells.eq(newPos).before($cells.eq(oldPos));
    } else {
      $cells.eq(newPos).after($cells.eq(oldPos));
    }
  });
};

scout.Table.prototype._renderColumnOrderChanges = function(oldColumnOrder) {
  var column, i, j, $orderedCells, $cell, $cells, that = this,
    $row;

  if (this.header) {
    this.header.onOrderChanged(oldColumnOrder);
  }

  // move cells
  this.$rows(true).each(function() {
    $row = $(this);
    $orderedCells = $();
    $cells = $row.children();
    for (i = 0; i < that.columns.length; i++) {
      column = that.columns[i];

      //Find $cell for given column
      for (j = 0; j < oldColumnOrder.length; j++) {
        if (oldColumnOrder[j] === column) {
          $cell = $cells[j];
          break;
        }
      }
      $orderedCells.push($cell);
    }
    $row.prepend($orderedCells);
  });
};

scout.Table.prototype._triggerRowsDrawn = function($rows, numRows) {
  var type = scout.Table.GUI_EVENT_ROWS_DRAWN;
  var event = {
    $rows: $rows,
    numRows: numRows
  };
  this.events.trigger(type, event);
};

scout.Table.prototype.triggerRowsSelected = function($rows) {
  var rowCount = this.rows.length,
    allSelected = false;

  if ($rows) {
    allSelected = $rows.length === rowCount;
  }

  var type = scout.Table.GUI_EVENT_ROWS_SELECTED;
  var event = {
    $rows: $rows,
    allSelected: allSelected
  };
  this.events.trigger(type, event);
};

scout.Table.prototype._triggerRowsFiltered = function(numRows, filterName) {
  var type = scout.Table.GUI_EVENT_ROWS_FILTERED;
  var event = {
    numRows: numRows,
    filterName: filterName
  };
  this.events.trigger(type, event);
};

scout.Table.prototype._triggerFilterResetted = function() {
  var type = scout.Table.GUI_EVENT_FILTER_RESETTED;
  this.events.trigger(type);
};

scout.Table.prototype._renderHeaderVisible = function() {
  this._renderTableHeader();
};

scout.Table.prototype._renderTableHeader = function() {
  if (this.headerVisible && !this.header) {
    this.header = this._createHeader();
  } else if (!this.headerVisible && this.header) {
    this.header.remove();
    this.header = null;
  }
  if (this.rendered) {
    this.htmlComp.revalidate();
  }
};

scout.Table.prototype._renderTableFooter = function() {
  var footerVisible = this._isFooterVisible();
  if (footerVisible) {
    if (!this.footer) {
      this.footer = this._createFooter();
    } else {
      this.footer.update();
    }
  } else if (!footerVisible && this.footer) {
    this.footer.remove();
    this.footer = null;
  }
  if (this.rendered) {
    this.htmlComp.revalidate();
  }
};

scout.Table.prototype._renderEnabled = function(enabled) {
  // FIXME CGU remove/add events. Maybe extend jquery to not fire on disabled events?
  this._$scrollable.setEnabled(enabled);
};

scout.Table.prototype._renderMultiSelect = function(multiSelect) {
  // nop
};

scout.Table.prototype._onRowOrderChanged = function(rowIds) {
  var newPos, rows, row;
  if (rowIds.length !== this.rows.length) {
    throw new Error('Row order changed event may not be processed because lengths of the arrays differ.');
  }

  // update model
  rows = scout.arrays.init(this.rows.length, 0);
  for (var i = 0; i < this.rows.length; i++) {
    row = this.rows[i];
    newPos = rowIds.indexOf(this.rows[i].id);
    rows[newPos] = row;
  }
  this.rows = rows;

  if (this.rendered) {
    this._renderRowOrderChanges();
  }
};

scout.Table.prototype._onColumnStructureChanged = function(columns) {
  //Index is not sent -> update received columns with the current indices
  for (var i = 0; i < columns.length; i++) {
    for (var j = 0; j < this.columns.length; j++) {
      if (columns[i].id === this.columns[j].id) {
        columns[i].index = this.columns[j].index;
        break;
      }
    }
  }
  this.columns = columns;

  if (this.rendered) {
    if (this.header) {
      this.header.remove();
      this.header = this._createHeader();
    }
    this.drawData();
  }
};

scout.Table.prototype._onColumnOrderChanged = function(columnIds) {
  var i, column, columnId, currentPosition, oldColumnOrder;
  if (columnIds.length !== this.columns.length) {
    throw new Error('Column order changed event may not be processed because lengths of the arrays differ.');
  }

  oldColumnOrder = this.columns.slice();

  for (i = 0; i < columnIds.length; i++) {
    columnId = columnIds[i];
    column = this.columnById(columnId);
    currentPosition = this.columns.indexOf(column);
    if (currentPosition < 0) {
      throw new Error('Column with id ' + columnId + 'not found.');
    }

    if (currentPosition !== i) {
      // Update model
      scout.arrays.remove(this.columns, column);
      scout.arrays.insert(this.columns, column, i);
    }
  }

  if (this.rendered) {
    this._renderColumnOrderChanges(oldColumnOrder);
  }
};

/**
 * @param columns array of columns which were updated.
 */
scout.Table.prototype._onColumnHeadersUpdated = function(columns) {
  var column,
    updatedColumns = [];

  //Update model columns
  for (var i = 0; i < columns.length; i++) {
    column = this.columnById(columns[i].id);
    column.text = columns[i].text;
    column.sortActive = columns[i].sortActive;
    column.sortAscending = columns[i].sortAscending;

    updatedColumns.push(column);
  }

  if (this.rendered && this.header) {
    this.header.updateHeaders(updatedColumns);
  }
};

scout.Table.prototype.onModelAction = function(event) {
  if (event.type === 'rowsInserted') {
    this._onRowsInserted(event.rows);
  } else if (event.type === 'rowsDeleted') {
    this._onRowsDeleted(event.rowIds);
  } else if (event.type === 'allRowsDeleted') {
    this._onAllRowsDeleted();
  } else if (event.type === 'rowsSelected') {
    this._onRowsSelected(event.rowIds);
  } else if (event.type === 'rowOrderChanged') {
    this._onRowOrderChanged(event.rowIds);
  } else if (event.type === 'columnStructureChanged') {
    this._onColumnStructureChanged(event.columns);
  } else if (event.type === 'columnOrderChanged') {
    this._onColumnOrderChanged(event.columnIds);
  } else if (event.type === 'columnHeadersUpdated') {
    this._onColumnHeadersUpdated(event.columns);
  } else {
    $.log.warn('Model event not handled. Widget: scout.Table. Event: ' + event.type + '.');
  }
};

/* --- STATIC HELPERS ------------------------------------------------------------- */

/**
 * @memberOf scout.Table
 */
scout.Table.parseHorizontalAlignment = function(alignment) {
  if (alignment > 0) {
    return 'right';
  }
  if (alignment === 0) {
    return 'center';
  }
  return 'left';
};
