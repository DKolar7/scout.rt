/* global MenuSpecHelper */
var TableSpecHelper = function(session) {
  this.session = session;
  this.menuHelper = new MenuSpecHelper(session);
};

TableSpecHelper.prototype.createModel = function(columns, rows) {
  var model = createSimpleModel('Table');
  $.extend(model, {
    "headerVisible": true,
    "multiSelect": true
  });

  //Server will never send undefined -> don't create model with undefined properties.
  if (rows) {
    model.rows = rows;
  }
  if (columns) {
    model.columns = columns;
  }

  return model;
};

TableSpecHelper.prototype.createModelRow = function(id, cells) {
  return {
    "id": id,
    "cells": cells
  };
};

/**
 *
 * @param texts array of texts for the cells in the new row or a string if only one cell should be created.
 * @param withoutCells true if only text instead of cells should be created (server only sends text without a cell object if no other properties are set)
 */
TableSpecHelper.prototype.createModelRowByTexts = function(id, texts, withoutCells) {
  texts = scout.arrays.ensure(texts);

  var cells = [];
  for (var i = 0; i < texts.length; i++) {
    if (!withoutCells) {
      cells[i] = this.createModelCell(texts[i]);
    } else {
      cells [i] = texts[i];
    }
  }
  return this.createModelRow(id, cells);
};

/**
*
* @param texts array of texts for the cells in the new row or a string if only one cell should be created.
*/
TableSpecHelper.prototype.createModelRowByValues = function(id, values) {
 values = scout.arrays.ensure(values);

 var cells = [];
 for (var i = 0; i < values.length; i++) {
   cells[i] = this.createModelCell(values[i], values[i]);
 }
 return this.createModelRow(id, cells);
};

TableSpecHelper.prototype.createModelColumn = function(id, text, type) {
  return {
    "id": id,
    "text": text,
    "type": type
  };
};

TableSpecHelper.prototype.createModelCell = function(text, value) {
  var cell = {};
  if (text) {
    cell.text = text;
  }
  if (value) {
    cell.value = value;
  }
  return cell;
};

TableSpecHelper.prototype.createMenuModel = function(text, icon) {
  return this.menuHelper.createModel(text, icon, ['Table.SingleSelection']);
};

TableSpecHelper.prototype.createModelColumns = function(count, columnType) {
  if (!count) {
    return;
  }
  if (!columnType) {
    columnType = 'text';
  }

  var columns = [];
  for (var i = 0; i < count; i++) {
    columns[i] = this.createModelColumn(i+'', 'col' + i, columnType);
  }
  return columns;
};

TableSpecHelper.prototype.createModelCells = function(count) {
  var cells = [];
  for (var i = 0; i < count; i++) {
    cells[i] = this.createModelCell(i + '', 'cell' + i);
  }
  return cells;
};

TableSpecHelper.prototype.createModelRows = function(colCount, rowCount) {
  if (!rowCount) {
    return;
  }

  var rows = [];
  for (var i = 0; i < rowCount; i++) {
    rows[i] = this.createModelRow(i + '', this.createModelCells(colCount));
  }
  return rows;
};

TableSpecHelper.prototype.createModelSingleColumnByTexts = function(texts) {
  var rows = [];
  for (var i=0; i < texts.length; i++) {
    rows.push(this.createModelRowByTexts(i, texts[i]));
  }
  return this.createModel(this.createModelColumns(1), rows);
};

TableSpecHelper.prototype.createModelSingleColumnByValues = function(values, columnType) {
  var rows = [];
  for (var i=0; i < values.length; i++) {
    rows.push(this.createModelRowByValues(i, values[i]));
  }
  return this.createModel(this.createModelColumns(1, columnType), rows);
};

TableSpecHelper.prototype.createModelFixture = function(colCount, rowCount) {
  return this.createModel(this.createModelColumns(colCount), this.createModelRows(colCount, rowCount));
};

TableSpecHelper.prototype.createTable = function(model) {
  var table = new scout.Table();
  table.init(model, this.session);
  return table;
};

TableSpecHelper.prototype.createMobileTable = function(model) {
  var table = new scout.MobileTable();
  table.init(model, this.session);
  return table;
};

TableSpecHelper.prototype.getRowIds = function(rows) {
  var rowIds = [];
  for (var i = 0; i < rows.length; i++) {
    rowIds.push(rows[i].id);
  }
  return rowIds;
};

TableSpecHelper.prototype.selectRowsAndAssert = function(table, rowIds) {
  table.selectRowsByIds(rowIds);
  this.assertSelection(table, rowIds);
};

TableSpecHelper.prototype.assertSelection = function(table, rowIds) {
  var $selectedRows = table.$selectedRows();
  expect($selectedRows.length).toBe(rowIds.length);

  var selectedRowIds = [];
  $selectedRows.each(function() {
    selectedRowIds.push($(this).attr('id'));
  });

  expect(scout.arrays.equalsIgnoreOrder(rowIds, selectedRowIds)).toBeTruthy();
  expect(scout.arrays.equalsIgnoreOrder(rowIds, table.selectedRowIds)).toBeTruthy();
};

/**
 * Asserts that the rows contain the given texts at column specified by colIndex
 * @param texts array with same length as rows.
 */
TableSpecHelper.prototype.assertTextsInCells = function(rows, colIndex, texts) {
  for (var i=0; i < rows.length; i++) {
    expect(rows[i].cells[colIndex].text).toBe(texts[i]);
  }
};

TableSpecHelper.prototype.assertValuesInCells = function(rows, colIndex, values) {
  for (var i=0; i < rows.length; i++) {
    expect(rows[i].cells[colIndex].value).toBe(values[i]);
  }
};

TableSpecHelper.prototype.assertDatesInCells = function(rows, colIndex, dates) {
  for (var i=0; i < rows.length; i++) {
    expect(rows[i].cells[colIndex].value.getTime()).toBe(dates[i].getTime());
  }
};

TableSpecHelper.prototype.assertSelectionEvent = function(id, rowIds) {
  var event = new scout.Event('rowsSelected', id, {
    "rowIds": rowIds
  });
  expect(mostRecentJsonRequest()).toContainEvents(event);
};

TableSpecHelper.prototype.getDisplayingContextMenu = function(table) {
  return $('body').find('.popup-body');
};
