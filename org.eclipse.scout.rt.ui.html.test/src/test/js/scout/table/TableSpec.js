/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG. All rights
 * reserved. This program and the accompanying materials are made available
 * under the terms of the Eclipse Public License v1.0 which accompanies this
 * distribution, and is available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: BSI Business Systems Integration AG - initial API and
 * implementation
 ******************************************************************************/
/* global removePopups */
describe("Table", function() {
  var session, helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    session.locale = new scout.LocaleSpecHelper().createLocale(scout.LocaleSpecHelper.DEFAULT_LOCALE);
    helper = new scout.TableSpecHelper(session);
    $.fx.off = true; // generation of sumrows is animated. leads to misleading test failures.
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
    helper.resetIntlCollator();
    $.fx.off = false;
  });

  describe("render", function() {

    it("renders CSS class", function() {
      // regular table
      var model = helper.createModelFixture(2, 1);
      var table = helper.createTable(model);
      table.render();
      expect('table', table.$container.attr('class'));

      // checkable table (row style)
      model.checkable = true;
      model.checkableStyle = scout.Table.CheckableStyle.TABLE_ROW;
      table = helper.createTable(model);
      table.render();
      expect('table checkable', table.$container.attr('class'));

      // row must have 'checked' class
      table.checkRow(table.rows[0], true, true);
      expect(table.$container.find('.table-row').first().hasClass('checked')).toBe(true);
    });

    it("renders a table header", function() {
      var model = helper.createModelFixture(2);
      var table = helper.createTable(model);
      table.render();

      expect(table.header).not.toBeUndefined();
    });

    describe("renders table rows", function() {

      it("accepts rows with cells", function() {
        var model = helper.createModelFixture(3, 1);
        model.rows[0] = helper.createModelRowByTexts(1, ['cell1', '', '0']);
        var table = helper.createTable(model);
        table.render();

        var $row0 = table.$rows().eq(0);
        var $cells = $row0.find('.table-cell');
        expect($cells.eq(0).text()).toBe('cell1');
        expect($cells.eq(1).html()).toBe('&nbsp;');
        expect($cells.eq(2).text()).toBe('0');
      });

      it("accepts rows with text only", function() {
        var model = helper.createModelFixture(3, 1);
        model.rows[0] = helper.createModelRowByTexts(1, ['cell1', '', '0'], true);
        var table = helper.createTable(model);
        table.render();

        var $row0 = table.$rows().eq(0);
        var $cells = $row0.find('.table-cell');
        expect($cells.eq(0).text()).toBe('cell1');
        expect($cells.eq(1).html()).toBe('&nbsp;');
        expect($cells.eq(2).text()).toBe('0');
      });

    });

  });

  describe("_calculateViewRangeForRowIndex", function() {
    it("returns a range based on viewRangeSize", function() {
      var model = helper.createModelFixture(2, 10);
      var table = helper.createTable(model);

      table.viewRangeSize = 4;
      expect(table._calculateViewRangeForRowIndex(0)).toEqual(new scout.Range(0, 4));
      expect(table._calculateViewRangeForRowIndex(1)).toEqual(new scout.Range(0, 4));
      expect(table._calculateViewRangeForRowIndex(2)).toEqual(new scout.Range(1, 5));
      expect(table._calculateViewRangeForRowIndex(3)).toEqual(new scout.Range(2, 6));
      expect(table._calculateViewRangeForRowIndex(6)).toEqual(new scout.Range(5, 9));
      expect(table._calculateViewRangeForRowIndex(7)).toEqual(new scout.Range(6, 10));
      expect(table._calculateViewRangeForRowIndex(8)).toEqual(new scout.Range(6, 10));
      expect(table._calculateViewRangeForRowIndex(9)).toEqual(new scout.Range(6, 10));

      table.viewRangeSize = 5;
      expect(table._calculateViewRangeForRowIndex(0)).toEqual(new scout.Range(0, 5));
      expect(table._calculateViewRangeForRowIndex(1)).toEqual(new scout.Range(0, 5));
      expect(table._calculateViewRangeForRowIndex(2)).toEqual(new scout.Range(1, 6));
      expect(table._calculateViewRangeForRowIndex(3)).toEqual(new scout.Range(2, 7));
      expect(table._calculateViewRangeForRowIndex(4)).toEqual(new scout.Range(3, 8));
      expect(table._calculateViewRangeForRowIndex(5)).toEqual(new scout.Range(4, 9));
      expect(table._calculateViewRangeForRowIndex(7)).toEqual(new scout.Range(5, 10));
      expect(table._calculateViewRangeForRowIndex(8)).toEqual(new scout.Range(5, 10));
      expect(table._calculateViewRangeForRowIndex(9)).toEqual(new scout.Range(5, 10));

      table.viewRangeSize = 8;
      expect(table._calculateViewRangeForRowIndex(0)).toEqual(new scout.Range(0, 8));
      expect(table._calculateViewRangeForRowIndex(1)).toEqual(new scout.Range(0, 8));
      expect(table._calculateViewRangeForRowIndex(2)).toEqual(new scout.Range(0, 8));
      expect(table._calculateViewRangeForRowIndex(3)).toEqual(new scout.Range(1, 9));
      expect(table._calculateViewRangeForRowIndex(4)).toEqual(new scout.Range(2, 10));
      expect(table._calculateViewRangeForRowIndex(7)).toEqual(new scout.Range(2, 10));
      expect(table._calculateViewRangeForRowIndex(8)).toEqual(new scout.Range(2, 10));
      expect(table._calculateViewRangeForRowIndex(9)).toEqual(new scout.Range(2, 10));
    });
  });

  describe("rowIcons and checkable rows", function() {

    var model, table, row;

    it("creates an artificial cell when a rowIcon is set on a row", function() {
      model = helper.createModelFixture(1);
      model.rowIconVisible = true;
      table = helper.createTable(model);
      row = helper.createModelRow(1, ['Foo']);
      row.rowIcon = scout.icons.WORLD;
      table.insertRow(row);

      var columns = table.columns;
      expect(columns.length).toBe(2);
      expect(columns[0] instanceof scout.IconColumn).toBe(true);
      var cell = table.cell(table.columns[0], table.rows[0]);
      expect(cell.cssClass).toBe('row-icon-cell');
    });

  });

  describe("insertRows", function() {
    var model, table;

    beforeEach(function() {
      model = helper.createModelFixture(2);
      table = helper.createTable(model);
    });

    it("inserts rows at the end of the table", function() {
      expect(table.rows.length).toBe(0);

      var rows = helper.createModelRows(2, 5);
      table.insertRows(rows);

      expect(table.rows.length).toBe(5);
      expect(Object.keys(table.rowsMap).length).toBe(5);

      rows = helper.createModelRows(2, 3);
      table.insertRows(rows);

      expect(table.rows.length).toBe(5 + 3);
      expect(Object.keys(table.rowsMap).length).toBe(5 + 3);
    });

    it("renders rows only if view range is not full yet", function() {
      table.viewRangeSize = 2;
      table.render();
      expect(table.rows.length).toBe(0);
      expect(table.$rows().length).toBe(0);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 0));

      table.insertRows(helper.createModelRows(2, 1));
      expect(table.rows.length).toBe(1);
      expect(table.$rows().length).toBe(1);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 1));

      // 2 rows may get rendered, one row already is. Inserting another 2 rows
      // must only render 1 row
      table.insertRows(helper.createModelRows(2, 2));
      expect(table.rows.length).toBe(3);
      expect(table.$rows().length).toBe(2);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 2));
    });

    it("rowsInserted event must be triggered before rowOrderChanged event", function() {
      var events = '',
        rowsOnInsert;
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      // we sort 1st column desc which means Z is before A
      model = helper.createModelFixture(1, 0);
      table = helper.createTable(model);
      table.sort(table.columns[0], 'desc');
      table.on('rowsInserted', function(event) {
        events += 'rowsInserted ';
        rowsOnInsert = event.rows;
      });
      table.on('rowOrderChanged', function() {
        events += 'rowOrderChanged';
      });
      table.insertRows([helper.createModelRow(1, ['A']), helper.createModelRow(1, ['Z'])]);

      // we expect exactly this order of events when new rows are inserted
      expect(events).toBe('rowsInserted rowOrderChanged');

      // when rowsInserted event occurs we expect the rows provided by the event
      // in the order they have been inserted (no sorting is done here)
      expect(rowsOnInsert[0].cells[0].text).toBe('A');
      expect(rowsOnInsert[1].cells[0].text).toBe('Z');

      // expect the rows in the table to be sorted as defined by the sort-column
      expect(table.rows[0].cells[0].text).toBe('Z');
      expect(table.rows[1].cells[0].text).toBe('A');
    });

  });

  describe("updateRows", function() {
    var model, table;

    beforeEach(function() {
      model = helper.createModelFixture(2, 2);
      model.rows[0].cells[0].text = 'cellText0';
      model.rows[0].cells[1].text = 'cellText1';
      table = helper.createTable(model);
    });

    it("updates the model cell texts", function() {
      expect(table.rows[0].cells[0].text).toBe('cellText0');
      expect(table.rows[0].cells[1].text).toBe('cellText1');

      var row = {
        id: table.rows[0].id,
        cells: ['newCellText0', 'newCellText1']
      };
      table.updateRows([row]);

      expect(table.rows[0].cells[0].text).toBe('newCellText0');
      expect(table.rows[0].cells[1].text).toBe('newCellText1');
    });

    it("updates the html cell texts", function() {
      table.render();
      var $rows = table.$rows();
      var $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('cellText0');
      expect($cells0.eq(1).text()).toBe('cellText1');

      var row = {
        id: table.rows[0].id,
        cells: ['newCellText0', 'newCellText1']
      };
      table.updateRows([row]);

      $rows = table.$rows();
      $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('newCellText0');
      expect($cells0.eq(1).text()).toBe('newCellText1');
    });

    it("does not fail if the row to update is the same instance as the existing one", function() {
      table.render();
      var $rows = table.$rows();
      var $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('cellText0');
      expect($cells0.eq(1).text()).toBe('cellText1');

      table.rows[0].cells[0].setText('newCellText0');
      table.rows[0].cells[1].setText('newCellText1');
      table.updateRows([table.rows[0]]);

      $rows = table.$rows();
      $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('newCellText0');
      expect($cells0.eq(1).text()).toBe('newCellText1');
    });

    it("does not destroy selection", function() {
      model = helper.createModelFixture(2, 3);
      model.rows[0].cells[0].text = 'cellText0';
      model.rows[0].cells[1].text = 'cellText1';
      table = helper.createTable(model);
      table.render();
      table.selectAll();

      expect(table.$selectedRows().length).toBe(3);
      expect(table.$selectedRows().eq(0)).toHaveClass('select-top');
      expect(table.$selectedRows().eq(1)).toHaveClass('select-middle');
      expect(table.$selectedRows().eq(2)).toHaveClass('select-bottom');
      var row = {
        id: table.rows[0].id,
        cells: ['newCellText0', 'newCellText1']
      };
      table.updateRows([row]);

      expect(table.$selectedRows().length).toBe(3);
      expect(table.$selectedRows().eq(0)).toHaveClass('select-top');
      expect(table.$selectedRows().eq(1)).toHaveClass('select-middle');
      expect(table.$selectedRows().eq(2)).toHaveClass('select-bottom');
    });

    it("silently updates rows which are not in view range", function() {
      table.viewRangeSize = 1;
      table.render();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 1));
      expect(table.$rows().length).toBe(1);
      expect(table.rows.length).toBe(2);
      var $rows = table.$rows();
      var $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('cellText0');

      var row0 = {
        id: table.rows[0].id,
        cells: ['newRow0Cell0', 'newRow0Cell1']
      };
      var row1 = {
        id: table.rows[1].id,
        cells: ['newRow1Cell0', 'newRow1Cell1']
      };
      table.updateRows([row0, row1]);

      // only row 0 is rendered but both rows need to be updated
      $rows = table.$rows();
      expect($rows.length).toBe(1);
      $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('newRow0Cell0');
      expect($cells0.eq(1).text()).toBe('newRow0Cell1');
      expect(table.rows[0].cells[0].text).toBe('newRow0Cell0');
      expect(table.rows[0].cells[1].text).toBe('newRow0Cell1');
      expect(table.rows[1].cells[0].text).toBe('newRow1Cell0');
      expect(table.rows[1].cells[1].text).toBe('newRow1Cell1');
    });
  });

  describe("deleteRows", function() {
    var model, table, rows, row0, row1, row2;

    beforeEach(function() {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
      rows = table.rows;
      row0 = model.rows[0];
      row1 = model.rows[1];
      row2 = model.rows[2];
    });

    it("deletes single rows from model", function() {
      expect(table.rows.length).toBe(3);
      expect(table.rows[0]).toBe(row0);

      table.deleteRows([table.rows[0]]);
      expect(table.rows.length).toBe(2);
      expect(table.rows[0]).toBe(row1);

      table.deleteRows([table.rows[0], table.rows[1]]);
      expect(table.rows.length).toBe(0);
    });

    it("deletes single rows from html document", function() {
      table.render();
      expect(table.$rows().length).toBe(3);

      table.deleteRows([table.rows[0]]);
      expect(table.$rows().length).toBe(2);
      expect(table.$rows().eq(0).data('row').id).toBe(row1.id);
      expect(table.$rows().eq(1).data('row').id).toBe(row2.id);

      table.deleteRows([table.rows[0], table.rows[1]]);
      expect(table.$rows().length).toBe(0);
    });

    it("considers view range (distinguishes between rendered and non rendered rows, adjusts viewRangeRendered)", function() {
      model = helper.createModelFixture(2, 6);
      table = helper.createTable(model);
      var spy = spyOn(table, '_calculateCurrentViewRange').and.returnValue(new scout.Range(1, 4));
      table.render();
      expect(table.viewRangeRendered).toEqual(new scout.Range(1, 4));
      expect(table.$rows().length).toBe(3);
      expect(table.rows.length).toBe(6);

      // reset spy -> view range now starts from 0
      spy.and.callThrough();
      table.viewRangeSize = 3;

      // delete first (not rendered)
      table.deleteRows([table.rows[0]]);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 3));
      expect(table.$rows().length).toBe(3);
      expect(table.rows.length).toBe(5);

      // delete first rendered
      table.deleteRows([table.rows[0]]);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 3));
      expect(table.$rows().length).toBe(3);
      expect(table.rows.length).toBe(4);

      // delete last not rendered
      table.deleteRows([table.rows[3]]);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 3));
      expect(table.$rows().length).toBe(3);
      expect(table.rows.length).toBe(3);

      // delete remaining (rendered) rows
      table.deleteRows([table.rows[0], table.rows[1], table.rows[2]]);
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 0));
      expect(table.$rows().length).toBe(0);
      expect(table.rows.length).toBe(0);
      expect(table.$fillBefore.height()).toBe(0);
      expect(table.$fillAfter.height()).toBe(0);
    });
  });

  describe("deleteAllRows", function() {
    var model, table;

    beforeEach(function() {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
    });

    it("deletes all rows from model", function() {
      expect(table.rows.length).toBe(3);

      table.deleteAllRows();
      expect(table.rows.length).toBe(0);
    });

    it("deletes all rows from html document", function() {
      table.render();
      expect(table.$rows().length).toBe(3);

      table.deleteAllRows();
      expect(table.$rows().length).toBe(0);
    });

    it("silently removes not rendered rows", function() {
      table.viewRangeSize = 2;
      table.render();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 2));
      expect(table.$rows().length).toBe(2);
      expect(table.rows.length).toBe(3);
      expect(table.$fillBefore.height()).toBe(0);
      expect(table.$fillAfter.height()).not.toBe(0);

      table.deleteAllRows();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 0));
      expect(table.$rows().length).toBe(0);
      expect(table.rows.length).toBe(0);
      expect(table.$fillBefore.height()).toBe(0);
      expect(table.$fillAfter.height()).toBe(0);
    });
  });

  describe("updateRowOrder", function() {
    var model, table, row0, row1, row2;

    beforeEach(function() {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
      row0 = table.rows[0];
      row1 = table.rows[1];
      row2 = table.rows[2];
    });

    it("reorders the model rows", function() {
      table.updateRowOrder([row2, row1, row0]);
      expect(table.rows.length).toBe(3);
      expect(table.rows[0]).toBe(row2);
      expect(table.rows[1]).toBe(row1);
      expect(table.rows[2]).toBe(row0);
    });

    it("reorders the html nodes", function() {
      table.render();
      table.updateRowOrder([row2, row1, row0]);
      var $rows = table.$rows();
      expect(true).toBe(true);
      expect($rows.eq(0).data('row').id).toBe(row2.id);
      expect($rows.eq(1).data('row').id).toBe(row1.id);
      expect($rows.eq(2).data('row').id).toBe(row0.id);
    });

    it("considers view range", function() {
      table.viewRangeSize = 2;
      table.render();

      var $rows = table.$rows();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 2));
      expect($rows.eq(0).data('row').id).toBe(model.rows[0].id);
      expect($rows.eq(1).data('row').id).toBe(model.rows[1].id);
      expect(table.$rows().length).toBe(2);
      expect(table.rows.length).toBe(3);

      table.updateRowOrder([row2, row1, row0]);
      $rows = table.$rows();
      expect($rows.eq(0).data('row').id).toBe(model.rows[2].id);
      expect($rows.eq(1).data('row').id).toBe(model.rows[1].id);
      expect(table.$rows().length).toBe(2);
      expect(table.rows.length).toBe(3);
    });
  });

  describe("checkRow", function() {

    function findCheckedRows(rows) {
      var checkedRows = [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].checked) {
          checkedRows.push(rows[i]);
        }
      }
      return checkedRows;
    }

    it("checks the row, does not uncheck others if multiCheck is set to true", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      model.multiCheck = true;
      var table = helper.createTable(model);
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true, true);
      table.checkRow(rows[4], true, true);

      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(2);

      table.checkRow(rows[4], false, true);

      checkedRows = [];
      for (var z = 0; z < rows.length; z++) {
        if (rows[z].checked) {
          checkedRows.push(rows[z]);
        }
      }
      expect(checkedRows.length).toBe(1);
    });

    it("unchecks other rows if multiCheck is set to false", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      model.multiCheck = false;
      var table = helper.createTable(model);
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true, true);
      table.checkRow(rows[4], true, true);

      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(1);

      table.checkRow(rows[4], false, true);

      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);
    });

    it("does not check the row if checkable is set to false", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = false;
      model.multiCheck = false;
      var table = helper.createTable(model);
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true, true);
      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);
    });

    it("does not check the row if the row is disabled", function() {
      var model = helper.createModelFixture(2, 5);
      model.multiCheck = false;
      model.checkable = false;
      var table = helper.createTable(model);
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);
      rows[0].enabled = false;
      table.checkRow(rows[0], true, true);
      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);
    });

    it("does not check the row if the table is disabled", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      model.multiCheck = true;
      var table = helper.createTable(model);
      table.enabled = false;
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true, true);
      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);
    });

    it("considers view range", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      model.multiCheck = true;
      var table = helper.createTable(model);
      table.viewRangeSize = 2;
      table.render();

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true);
      table.checkRow(rows[2], true);

      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(2);
      expect(table.$rows().length).toBe(2);
      expect(table.$rows().eq(0).data('row').checked).toBe(true);
      expect(table.$rows().eq(1).data('row').checked).toBe(false);
    });

    it("keeps added checkable column visible even when reloading factory settings", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      model.multiCheck = true;
      var table = helper.createTable(model);
      table.render(session.$entryPoint);

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      table.checkRow(rows[0], true, true);
      checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(1);

      var colsDeepCopy = $.extend(true, [], table.columns);
      expect(table.columns.length).toBe(3);
      colsDeepCopy.shift();
      table.updateColumnStructure(colsDeepCopy);
      expect(table.columns.length).toBe(3);
    });

    it("does not add an additional checkable column if one is already configured", function() {
      var model = helper.createModelSingleConfiguredCheckableColumn(5);
      model.checkable = true;
      model.multiCheck = true;
      var table = helper.createTable(model);
      table.render(session.$entryPoint);

      var rows = table.rows;
      var checkedRows = findCheckedRows(rows);
      expect(checkedRows.length).toBe(0);

      expect(table.columns.length).toBe(1);
    });

  });

  describe("selectRows", function() {

    it("updates model", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.render();

      var rows = [table.rows[0], model.rows[4]];
      table.selectRows(rows);

      expect(table.selectedRows).toEqual(rows);
    });

    it("selects rendered rows and unselects others", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.render();

      var $selectedRows = table.$selectedRows();
      expect($selectedRows.length).toBe(0);

      helper.selectRowsAndAssert(table, [model.rows[0], model.rows[4]]);
      helper.selectRowsAndAssert(table, [model.rows[2]]);
    });

    it("considers view range", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      var rows = table.rows;
      table.viewRangeSize = 2;
      table.render();
      table.selectRows(rows[2]);
      expect(table.selectedRows.length).toBe(1);
      expect(table.$selectedRows().length).toBe(0);

      table.selectRows([rows[1], rows[2]]);
      expect(table.selectedRows.length).toBe(2);
      expect(table.$selectedRows().length).toBe(1);
    });

    it("triggers rowsSelected", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var rows = [table.rows[0], table.rows[4]];
      var eventTriggered = false;
      table.on('rowsSelected', function() {
        eventTriggered = true;
      });
      table.selectRows(rows);
      expect(eventTriggered).toBe(true);
    });

    it("selectedRow() returns first selected row or null when table has no selection", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.selectRows([table.rows[1], table.rows[2]]);
      expect(table.selectedRow()).toBe(table.rows[1]);

      table.selectRows([]);
      expect(table.selectedRow()).toBe(null);
    });

  });

  describe("toggle selection", function() {
    it("selects all if not all are selected", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $selectedRows = table.$selectedRows();
      expect($selectedRows.length).toBe(0);

      table.toggleSelection();
      helper.assertSelection(table, model.rows);
      sendQueuedAjaxCalls();
      helper.assertSelectionEvent(model.id, helper.getRowIds(model.rows));
    });

    it("selects none if all are selected", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $selectedRows = table.$selectedRows();
      expect($selectedRows.length).toBe(0);

      helper.selectRowsAndAssert(table, table.rows);

      table.toggleSelection();
      helper.assertSelection(table, []);
      sendQueuedAjaxCalls();
      helper.assertSelectionEvent(model.id, []);

      table.toggleSelection();
      helper.assertSelection(table, table.rows);
      sendQueuedAjaxCalls();
      helper.assertSelectionEvent(model.id, helper.getRowIds(table.rows));
    });
  });

  describe("selectAll", function() {
    it("selects all rows", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.render();

      expect(table.selectedRows.length).toBe(0);
      expect(table.$selectedRows().length).toBe(0);

      table.selectAll();
      expect(table.selectedRows.length).toBe(5);
      expect(table.$selectedRows().length).toBe(5);
    });

    it("considers view range -> renders selection only for rendered rows", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.viewRangeSize = 2;
      table.render();

      expect(table.selectedRows.length).toBe(0);
      expect(table.$selectedRows().length).toBe(0);

      table.selectAll();
      expect(table.selectedRows.length).toBe(5);
      expect(table.$selectedRows().length).toBe(2);
    });
  });

  describe("doRowAction", function() {

    it("sends rowAction event with row and column", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      var row0 = table.rows[0];
      var column0 = table.columns[0];

      table.selectedRows = [row0];
      table.render();
      table.doRowAction(row0, column0);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(1);
      expect(mostRecentJsonRequest().events.length).toBe(1);

      var event = new scout.RemoteEvent(table.id, 'rowAction', {
        columnId: column0.id,
        rowId: row0.id
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it("does not send rowAction event if the row is not selected", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      var row0 = table.rows[0];
      var column0 = table.columns[0];

      // no selection at all
      table.selectedRows = [];
      table.render();
      table.doRowAction(row0, column0);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(0);

      // other row selected
      table.selectedRows = [table.rows[1]];
      table.doRowAction(row0, column0);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(0);

      // correct row selected -> expect event
      table.selectedRows = [row0];
      table.doRowAction(row0, column0);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(1);
      expect(mostRecentJsonRequest().events.length).toBe(1);

      var event = new scout.RemoteEvent(table.id, 'rowAction', {
        columnId: column0.id,
        rowId: row0.id
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it("does not send rowAction event if it is not the only one selected row", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      var row0 = table.rows[0];
      var column0 = table.columns[0];

      // no selection at all
      table.selectedRows = [row0, table.rows[1]];
      table.render();
      table.doRowAction(row0, column0);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(0);
    });

  });

  describe("resizeColumn", function() {

    it("updates column model and sends resize event ", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      expect(table.columns[0].width).not.toBe(100);
      table.resizeColumn(table.columns[0], 100);
      expect(table.columns[0].width).toBe(100);

      sendQueuedAjaxCalls('', 1000);
      var event = new scout.RemoteEvent(table.id, 'columnResized', {
        columnId: table.columns[0].id,
        width: 100,
        showBusyIndicator: false
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it("does not send resize event when resizing is in progress", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      table.resizeColumn(table.columns[0], 50);
      table.resizeColumn(table.columns[0], 100);

      sendQueuedAjaxCalls();

      expect(jasmine.Ajax.requests.count()).toBe(0);
    });

    it("sends resize event when resizing is finished", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      table.resizeColumn(table.columns[0], 50);
      table.resizeColumn(table.columns[0], 100);
      table.resizeColumn(table.columns[0], 150);

      sendQueuedAjaxCalls('', 1000);

      expect(jasmine.Ajax.requests.count()).toBe(1);
      expect(mostRecentJsonRequest().events.length).toBe(1);

      var event = new scout.RemoteEvent(table.id, 'columnResized', {
        columnId: table.columns[0].id,
        width: 150,
        showBusyIndicator: false
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

  });

  describe("autoResizeColumns", function() {

    it("distributes the table columns using initialWidth as weight", function() {
      var model = helper.createModelFixture(2);
      model.columns[0].initialWidth = 100;
      model.columns[1].initialWidth = 200;
      var table = helper.createTable(model);
      table.render();
      table.$data.width(450);

      table.setProperty('autoResizeColumns', true);

      // Triggers TableLayout._layoutColumns()
      table.revalidateLayout();

      expect(table.columns[0].width).toBe(150);
      expect(table.columns[1].width).toBe(300);
    });

    it("excludes columns with fixed width", function() {
      var model = helper.createModelFixture(2);
      model.columns[0].initialWidth = 100;
      model.columns[0].width = model.columns[0].initialWidth;
      model.columns[0].fixedWidth = true;
      model.columns[1].initialWidth = 200;
      model.columns[1].width = model.columns[1].initialWidth;
      var table = helper.createTable(model);
      table.render();
      table.$data.width(450);

      table.setProperty('autoResizeColumns', true);

      // Triggers TableLayout._layoutColumns()
      table.revalidateLayout();

      expect(table.columns[0].width).toBe(100);
      expect(table.columns[1].width).toBe(350);
    });

    it("does not make the column smaller than the initial size", function() {
      var model = helper.createModelFixture(2);
      model.columns[0].initialWidth = 100;
      model.columns[1].initialWidth = 200;
      var table = helper.createTable(model);
      table.render();
      table.$data.width(240);

      table.setProperty('autoResizeColumns', true);

      // Triggers TableLayout._layoutColumns()
      table.revalidateLayout();

      expect(table.columns[0].width).toBe(100); // would be 80, but does not get
      // smaller than initialSize
      expect(table.columns[1].width).toBe(200); // would be 160, but does not
      // get smaller than initialSize
    });

    it("does not make the column smaller than a minimum size", function() {
      var model = helper.createModelFixture(2);
      model.columns[0].initialWidth = 1000;
      model.columns[1].initialWidth = scout.Column.DEFAULT_MIN_WIDTH - 10;
      var table = helper.createTable(model);
      table.render();
      table.$data.width(450);

      table.setProperty('autoResizeColumns', true);

      // Triggers TableLayout._layoutColumns()
      table.revalidateLayout();

      expect(table.columns[0].width).toBe(1000);
      expect(table.columns[1].width).toBe(scout.Column.DEFAULT_MIN_WIDTH);
    });

  });

  describe("sort", function() {
    var model, table, adapter, column0, column1, column2;
    var $colHeaders, $header0, $header1, $header2;

    function prepareTable() {
      model = helper.createModelFixture(3, 3);
      table = helper.createTable(model);
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
    }

    function prepareTableWithAdapter() {
      model = helper.createModelFixture(3, 3);
      adapter = helper.createTableAdapter(model);
      table = adapter.createWidget(model, session.desktop);
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
    }

    function render(table) {
      table.render();
      $colHeaders = table.header.$container.find('.table-header-item');
      $header0 = $colHeaders.eq(0);
      $header1 = $colHeaders.eq(1);
      $header2 = $colHeaders.eq(2);
    }

    it("updates column model", function() {
      prepareTable();
      render(table);
      table.sort(column0, 'desc');

      expect(table.columns[0].sortActive).toBe(true);
      expect(table.columns[0].sortAscending).toBe(false);
      expect(table.columns[0].sortIndex).toBe(0);
    });

    describe('model update', function() {
      it("sets sortAscending according to direction param", function() {
        prepareTable();
        render(table);

        table.sort(column0, 'desc');
        expect(table.columns[0].sortAscending).toBe(false);

        table.sort(column0, 'asc');
        expect(table.columns[0].sortAscending).toBe(true);
      });

      it("resets properties on other columns", function() {
        prepareTable();
        render(table);

        // reset logic is only applied on columns used as sort-column, that's
        // why
        // we must set the sortActive flag here.
        table.columns[1].sortActive = true;

        table.sort(column0, 'desc');
        expect(table.columns[0].sortActive).toBe(true);
        expect(table.columns[0].sortAscending).toBe(false);
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortActive).toBe(false);
        expect(table.columns[1].sortIndex).toBe(-1);

        table.sort(column1, 'desc');
        expect(table.columns[0].sortActive).toBe(false);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortActive).toBe(true);
        expect(table.columns[1].sortAscending).toBe(false);
        expect(table.columns[1].sortIndex).toBe(0);
      });

      it("sets sortIndex", function() {
        prepareTable();
        render(table);

        // reset logic is only applied on columns used as sort-column, that's
        // why
        // we must set the sortActive flag here.
        table.columns[1].sortActive = true;

        table.sort(column0, 'desc');
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(-1);

        table.sort(column1, 'desc', true);
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(1);

        table.sort(column1, 'desc');
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(0);
      });

      it("does not remove sortIndex for columns always included at begin", function() {
        prepareTable();
        column1.initialAlwaysIncludeSortAtBegin = true;
        column1.sortActive = true;
        column1.sortIndex = 1;
        column2.initialAlwaysIncludeSortAtBegin = true;
        column2.sortActive = true;
        column2.sortIndex = 0;
        table.updateColumnStructure(table.columns); // (re)initialize columns,
        // have been initialised
        // already during init
        render(table);

        table.sort(table.columns[0], 'desc');
        expect(table.columns[0].sortIndex).toBe(2);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[1], 'desc');
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[1], 'desc', true, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[2], 'desc', false, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);
      });

      it("does not remove sortIndex for columns always included at end", function() {
        prepareTable();
        column1.initialAlwaysIncludeSortAtEnd = true;
        column1.sortActive = true;
        column1.sortIndex = 1;
        column2.initialAlwaysIncludeSortAtEnd = true;
        column2.sortActive = true;
        column2.sortIndex = 0;
        table.updateColumnStructure(table.columns); // (re)initialize columns,
        // have been initialised
        // already during init
        render(table);

        table.sort(table.columns[0], 'desc');
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(2);
        expect(table.columns[2].sortIndex).toBe(1);

        table.sort(table.columns[1], 'desc');
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[2], 'desc', true, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[1], 'desc', false, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);
      });

      it("does not remove sortIndex for columns always included at begin and end (combination)", function() {
        prepareTable();
        column1.initialAlwaysIncludeSortAtEnd = true;
        column1.sortActive = true;
        column1.sortIndex = 1;
        column2.initialAlwaysIncludeSortAtBegin = true;
        column2.sortActive = true;
        column2.sortIndex = 0;
        table.updateColumnStructure(table.columns); // (re)initialize columns,
        // have been initialised
        // already during init
        render(table);

        table.sort(table.columns[0], 'desc');
        expect(table.columns[0].sortIndex).toBe(1);
        expect(table.columns[1].sortIndex).toBe(2);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[1], 'desc');
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[2], 'desc', true, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);

        table.sort(table.columns[1], 'desc', false, true);
        expect(table.columns[0].sortIndex).toBe(-1);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(0);
      });

      it("removes column from sort columns", function() {
        prepareTable();
        render(table);

        // reset logic is only applied on columns used as sort-column, that's
        // why
        // we must set the sortActive flag here.
        table.columns[1].sortActive = true;

        table.sort(column0, 'desc');
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(-1);

        table.sort(column1, 'desc', true);
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(1);

        table.sort(column2, 'desc', true);
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(1);
        expect(table.columns[2].sortIndex).toBe(2);

        // Remove second column -> sortIndex of 3rd column gets adjusted
        table.sort(column1, 'desc', false, true);
        expect(table.columns[0].sortIndex).toBe(0);
        expect(table.columns[1].sortIndex).toBe(-1);
        expect(table.columns[2].sortIndex).toBe(1);
      });
    });

    it("sends sort without sortingRequested event when client side sorting is possible", function() {
      prepareTableWithAdapter();
      render(table);
      // Make sure sorting is not executed because it does not work with
      // phantomJS
      spyOn(scout.device, "supportsInternationalization").and.returnValue(true);
      spyOn(table, "_sort").and.returnValue(true);

      table.sort(column0, 'desc');
      sendQueuedAjaxCalls();

      var event = new scout.RemoteEvent(table.id, 'sort', {
        columnId: table.columns[0].id,
        sortAscending: false
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it("sends sort event with sortingRequested if client side sorting is not possible", function() {
      prepareTableWithAdapter();
      render(table);
      spyOn(scout.device, "supportsInternationalization").and.returnValue(false);

      table.sort(column0, 'desc');
      sendQueuedAjaxCalls();

      var event = new scout.RemoteEvent(table.id, 'sort', {
        columnId: table.columns[0].id,
        sortAscending: false,
        sortingRequested: true
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it("sorts the data", function() {
      prepareTable();
      render(table);
      spyOn(table, '_sort');

      table.sort(column0, 'desc');

      expect(table._sort).toHaveBeenCalled();
    });

    it("regroups the data if group by column is active", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }

      prepareTable();
      render(table);

      // Make sure sorting is not executed because it does not work with
      // phantomJS
      spyOn(scout.device, "supportsInternationalization").and.returnValue(true);
      spyOn(table, "_sortImpl").and.returnValue(true);
      spyOn(table, '_group');

      column0.grouped = true;
      table.sort(column0, 'desc');

      expect(table._group).toHaveBeenCalled();
    });

    it("restores selection after sorting", function() {
      var model = helper.createModelSingleColumnByValues([5, 2, 1, 3, 4], 'NumberColumn'),
        table = helper.createTable(model),
        column0 = model.columns[0],
        rows = table.rows;
      table.render();

      var $rows = table.$rows();
      var $row0 = $rows.eq(0);
      var $row1 = $rows.eq(1);
      var $row2 = $rows.eq(2);
      var $row3 = $rows.eq(3);
      var $row4 = $rows.eq(4);

      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('selected');

      table.selectRows([rows[1], rows[2], rows[3]]);

      expect([$row0, $row4]).not.anyToHaveClass('selected');
      expect([$row0, $row2, $row3, $row4]).not.anyToHaveClass('select-top');
      expect([$row0, $row1, $row3, $row4]).not.anyToHaveClass('select-middle');
      expect([$row0, $row1, $row2, $row4]).not.anyToHaveClass('select-bottom');
      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('select-single');

      // sort table (descending)
      table.sort(column0, 'desc');

      // after sorting
      $rows = table.$rows();
      $row0 = $rows.eq(0);
      $row1 = $rows.eq(1);
      $row2 = $rows.eq(2);
      $row3 = $rows.eq(3);
      $row4 = $rows.eq(4);
      expect([$row2, $row3, $row4]).allToHaveClass('selected');
      expect($row2).toHaveClass('select-top');
      expect($row3).toHaveClass('select-middle');
      expect($row4).toHaveClass('select-bottom');

      expect([$row0, $row4]).not.allToHaveClass('selected');
      expect([$row0, $row1, $row3, $row4]).not.anyToHaveClass('select-top');
      expect([$row0, $row1, $row2, $row4]).not.anyToHaveClass('select-middle');
      expect([$row0, $row1, $row2, $row3]).not.anyToHaveClass('select-bottom');
      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('select-single');
    });

    describe("sorting", function() {

      it("sorts text columns considering locale (if browser supports it)", function() {
        if (!scout.device.supportsInternationalization()) {
          return;
        }

        var model = helper.createModelSingleColumnByTexts(['Österreich', 'Italien', 'Zypern']);
        var table = helper.createTable(model);
        column0 = model.columns[0];
        table.render();

        table.sort(column0, 'desc');
        helper.assertTextsInCells(table.rows, 0, ['Zypern', 'Österreich', 'Italien']);

        table.sort(column0, 'asc');
        helper.assertTextsInCells(table.rows, 0, ['Italien', 'Österreich', 'Zypern']);

        // In order to change Collator at runtime, we must reset the "static"
        // property
        // since it is set only once
        session.locale = new scout.LocaleSpecHelper().createLocale('sv');
        helper.resetIntlCollator();

        table.sort(column0, 'desc');
        helper.assertTextsInCells(table.rows, 0, ['Österreich', 'Zypern', 'Italien']);

        table.sort(column0, 'asc');
        helper.assertTextsInCells(table.rows, 0, ['Italien', 'Zypern', 'Österreich']);
      });

      it("sorts number columns", function() {
        var model = helper.createModelSingleColumnByValues([100, 90, 300], 'NumberColumn');
        var table = helper.createTable(model);
        column0 = model.columns[0];
        table.render();

        table.sort(column0, 'desc');
        helper.assertValuesInCells(table.rows, 0, [300, 100, 90]);

        table.sort(column0, 'asc');
        helper.assertValuesInCells(table.rows, 0, [90, 100, 300]);
      });

      it("sorts date columns", function() {
        var model = helper.createModelSingleColumnByValues([new Date('2012-08-10'), new Date('2014-03-01'), new Date('1999-01-10')], 'DateColumn');
        var table = helper.createTable(model);
        column0 = model.columns[0];
        table.render();

        table.sort(column0, 'desc');
        helper.assertDatesInCells(table.rows, 0, [new Date('2014-03-01'), new Date('2012-08-10'), new Date('1999-01-10')]);

        table.sort(column0, 'asc');
        helper.assertDatesInCells(table.rows, 0, [new Date('1999-01-10'), new Date('2012-08-10'), new Date('2014-03-01')]);
      });

      it("uses non sort columns as fallback", function() {
        if (!scout.device.supportsInternationalization()) {
          return;
        }

        var model = helper.createModelFixture(2, 4);
        var table = helper.createTable(model);

        column0 = model.columns[0];
        column1 = model.columns[1];

        column0.setCellValue(model.rows[0], 'zzz');
        column1.setCellValue(model.rows[0], 'same');
        column0.setCellValue(model.rows[1], 'aaa');
        column1.setCellValue(model.rows[1], 'other');
        column0.setCellValue(model.rows[2], 'ccc');
        column1.setCellValue(model.rows[2], 'other');
        column0.setCellValue(model.rows[3], 'qqq');
        column1.setCellValue(model.rows[3], 'same');

        table.render();

        expect(column0.sortAscending).toBe(true);
        table.sort(column1, 'asc');
        helper.assertValuesInCells(table.rows, 0, ['aaa', 'ccc', 'qqq', 'zzz']);
        helper.assertValuesInCells(table.rows, 1, ['other', 'other', 'same', 'same']);

        table.sort(column1, 'desc');
        helper.assertValuesInCells(table.rows, 0, ['qqq', 'zzz', 'aaa', 'ccc']);
        helper.assertValuesInCells(table.rows, 1, ['same', 'same', 'other', 'other']);

        // sortAscending of a column with sortActive = false shouldn't have any
        // effect
        column0.sortAscending = false;
        table.sort(column1, 'asc');
        helper.assertValuesInCells(table.rows, 0, ['aaa', 'ccc', 'qqq', 'zzz']);
        helper.assertValuesInCells(table.rows, 1, ['other', 'other', 'same', 'same']);
      });

    });

  });

  describe("column grouping", function() {
    var model, table, column0, column1, column2, column3, column4, rows, columns, adapter;
    var $colHeaders, $header0, $header1;

    function prepareTable(withAdapter) {
      columns = [helper.createModelColumn('col0'),
        helper.createModelColumn('col1'),
        helper.createModelColumn('col2'),
        helper.createModelColumn('col3', 'NumberColumn'),
        helper.createModelColumn('col4', 'NumberColumn')
      ];
      columns[0].index = 0;
      columns[1].index = 1;
      columns[2].index = 2;
      columns[3].index = 3;
      columns[4].index = 4;
      rows = helper.createModelRows(5, 8);
      model = helper.createModel(columns, rows);
      if (withAdapter) {
        adapter = helper.createTableAdapter(model);
        table = adapter.createWidget(model, session.desktop);
      } else {
        table = helper.createTable(model);
      }
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
      column3 = model.columns[3];
      column4 = model.columns[4];
      column3.setAggregationFunction('sum');
      column4.setAggregationFunction('sum');
    }

    function prepareContent() {
      var column0Values = ['a', 'b'],
        column1Values = ['c', 'd'],
        column2Values = ['e', 'f'],
        value, text, j;

      for (var i = 0; i < rows.length; i++) {
        value = column0Values[Math.floor(i / 4)];
        text = value.toString();
        rows[i].cells[0] = column0.initCell(helper.createModelCell(text, value));

        value = column1Values[(Math.floor(i / 2)) % 2];
        text = value.toString();
        rows[i].cells[1] = column1.initCell(helper.createModelCell(text, value));

        value = column2Values[i % 2];
        text = value.toString();
        rows[i].cells[2] = column2.initCell(helper.createModelCell(text, value));

        j = i + 1;
        rows[i].cells[3].value = j;
        rows[i].cells[3].text = j.toString();
        rows[i].cells[4].value = j * 3;
        rows[i].cells[4].text = (j * 3).toString();
      }

    }

    function render(table) {
      table.render();
      $colHeaders = table.header.$container.find('.table-header-item');
      $header0 = $colHeaders.eq(0);
      $header1 = $colHeaders.eq(1);
    }

    function addGrouping(table, column, multi) {
      table.groupColumn(column, multi, 'asc', false);
    }

    function removeGrouping(table, column) {
      table.groupColumn(column, "", 'asc', true);
    }

    function assertGroupingProperty(table) {
      var i, expectGrouped = scout.arrays.init(5, false);
      for (i = 1; i < arguments.length; i++) {
        expectGrouped[arguments[i]] = true;
      }

      for (i = 0; i < 5; i++) {
        if (expectGrouped[i]) {
          expect(table.columns[i].grouped).toBeTruthy();
        } else {
          expect(table.columns[i].grouped).toBeFalsy();
        }
      }
    }

    function find$aggregateRows(table) {
      return table.$data.find('.table-aggregate-row');
    }

    function assertGroupingValues(table, column, values) {
      var i, c, $sumCell;
      c = table.columns.indexOf(column);
      expect(find$aggregateRows(table).length).toBe(values.length);

      for (i = 0; i < values.length; i++) {
        $sumCell = find$aggregateRows(table).eq(i).children().eq(c);
        $sumCell.find('.table-cell-icon').remove();
        expect($sumCell.text()).toBe(values[i]);
      }
    }

    it("renders an aggregate row for each group", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      expect(table._aggregateRows.length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      expect(table._aggregateRows.length).toBe(2);
    });

    it("considers groupingStyle -> aggregate rows must be rendered previous to the grouped rows", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      table.groupingStyle = scout.Table.GroupingStyle.TOP;
      prepareContent();
      render(table);
      addGrouping(table, column0, false);

      var // check in the DOM if the aggregate row comes previous to the first
      // row of the group
        $mixedRows = table.$data.children('.table-row,.table-aggregate-row'),
        $aggregateRows = table.$data.find('.table-aggregate-row'),
        aggrRow1Pos = $mixedRows.index($aggregateRows.get(0)),
        aggrRow2Pos = $mixedRows.index($aggregateRows.get(1)),
        rowFirstPos = $mixedRows.index(table.$data.find('.table-row.first')),
        rowLastPos = $mixedRows.index(table.$data.find('.table-row.last'));

      expect(aggrRow1Pos < rowFirstPos).toBe(true);
      expect(aggrRow2Pos < rowLastPos).toBe(true);
    });

    it("considers view range -> only renders an aggregate row for rendered rows", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      table.viewRangeSize = 4;
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      expect(table._aggregateRows.length).toBe(0);
      addGrouping(table, column0, false); // -> 2 groups with 4 rows each

      // Only the first group should be rendered
      expect(table._aggregateRows.length).toBe(2);
      expect(find$aggregateRows(table).length).toBe(1);
      expect(table.$rows().length).toBe(4);
      expect(table.$rows(true).length).toBe(5);
      expect(table._aggregateRows[0].$row).toBeTruthy();
      expect(table._aggregateRows[1].$row).toBeFalsy();
    });

    it("considers view range -> doesn't render an aggregate row if the last row of the group is not rendered", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      table.viewRangeSize = 3;
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      expect(table._aggregateRows.length).toBe(0);
      addGrouping(table, column0, false); // -> 2 groups with 4 rows each

      // Only 3 rows of the first group are rendered -> don't display aggregate
      // row
      expect(table._aggregateRows.length).toBe(2);
      expect(find$aggregateRows(table).length).toBe(0);
      expect(table.$rows().length).toBe(3);
      expect(table.$rows(true).length).toBe(3);
      expect(table._aggregateRows[0].$row).toBeFalsy();
      expect(table._aggregateRows[1].$row).toBeFalsy();

      spyOn(table, '_calculateCurrentViewRange').and.returnValue(new scout.Range(1, 4));
      table._renderViewport();

      // Last row is rendered -> aggregate row needs to be rendered as well
      expect(table._aggregateRows.length).toBe(2);
      expect(find$aggregateRows(table).length).toBe(1);
      expect(table.$rows().length).toBe(3);
      expect(table.$rows(true).length).toBe(4);
      expect(table._aggregateRows[0].$row).toBeTruthy();
      expect(table._aggregateRows[1].$row).toBeFalsy();
    });

    it("regroups if rows get inserted", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);

      // add new row for group 1
      var rows = [{
        cells: ['a', 'xyz', 'xyz', 10, 20]
      }];
      table.insertRows(rows);

      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['20', '26']);
      assertGroupingValues(table, column4, ['50', '78']);
    });

    it("regroups if rows get inserted, event is from server and table was empty", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable(true);
      render(table);
      table.deleteAllRows();
      expect(table.rows.length).toBe(0);
      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(0);

      // add new row for group 1
      var rows = [{
        cells: ['a', 'xyz', 'xyz', 10, 20]
      }];
      table.insertRows(rows);

      expect(find$aggregateRows(table).length).toBe(1);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10']);
      assertGroupingValues(table, column4, ['20']);
    });

    it("does not regroup if rows get inserted, event is from server and table was not empty", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable(true);
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);

      // add new row for group 1
      var rows = [{
        cells: ['a', 'xyz', 'xyz', 10, 20]
      }];
      table.insertRows(rows);

      // Still wrong grouping because group was not executed. There will be a rowOrderChanged event which will do it, see comments in table.insertRows
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);
    });

    it("regroups if rows get deleted", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);

      table.deleteRow(table.rows[0]);
      expect(find$aggregateRows(table).length).toBe(2);
      expect(table._aggregateRows.length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['9', '26']);
      assertGroupingValues(table, column4, ['27', '78']);

      table.deleteRows([table.rows[0], table.rows[1], table.rows[2]]);
      expect(find$aggregateRows(table).length).toBe(1);
      expect(table._aggregateRows.length).toBe(1);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['26']);
      assertGroupingValues(table, column4, ['78']);
    });

    it("removes aggregate rows if all rows get deleted", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      expect(table._aggregateRows.length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);

      table.deleteAllRows();
      expect(find$aggregateRows(table).length).toBe(0);
      expect(table._aggregateRows.length).toBe(0);
      assertGroupingProperty(table, 0);
    });

    it("regroups if rows get updated", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);

      var row = {
        id: table.rows[1].id,
        cells: ['a', 'xyz', 'xyz', 10, 20]
      };
      table.updateRows([row]);
      expect(find$aggregateRows(table).length).toBe(2);
      expect(table._aggregateRows.length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['18', '26']);
      assertGroupingValues(table, column4, ['44', '78']);
    });

    it("may group column 0 only", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 0);
      assertGroupingValues(table, column3, ['10', '26']);
      assertGroupingValues(table, column4, ['30', '78']);
      removeGrouping(table, column0);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);
    });

    it("may group column 1 only", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column1, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 1);
      assertGroupingValues(table, column3, ['14', '22']);
      assertGroupingValues(table, column4, ['42', '66']);
      removeGrouping(table, column1);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);
    });

    it("may group columns 0 (avg) and 1 (sum)", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);
      column3.setAggregationFunction('avg');
      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      addGrouping(table, column1, true);
      expect(find$aggregateRows(table).length).toBe(4);
      assertGroupingProperty(table, 0, 1);
      assertGroupingValues(table, column3, ['1.5', '3.5', '5.5', '7.5']);
      assertGroupingValues(table, column4, ['9', '21', '33', '45']);
      removeGrouping(table, column0);
      removeGrouping(table, column1);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);

    });

    it("may group columns 0, 1 and 2", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      addGrouping(table, column1, true);
      addGrouping(table, column2, true);
      expect(find$aggregateRows(table).length).toBe(8);
      assertGroupingProperty(table, 0, 1, 2);
      assertGroupingValues(table, column3, ['1', '2', '3', '4', '5', '6', '7', '8']);
      assertGroupingValues(table, column4, ['3', '6', '9', '12', '15', '18', '21', '24']);
      removeGrouping(table, column0);
      removeGrouping(table, column1);
      removeGrouping(table, column2);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);

    });

    // vary order
    it("may group columns 2 and 1", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column2, false);
      addGrouping(table, column1, true);
      expect(find$aggregateRows(table).length).toBe(4);
      assertGroupingProperty(table, 2, 1);
      assertGroupingValues(table, column3, ['6', '10', '8', '12']);
      assertGroupingValues(table, column4, ['18', '30', '24', '36']);
      removeGrouping(table, column1);
      removeGrouping(table, column2);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);

    });

    it("may group column 1 only after grouping column 0 first", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      addGrouping(table, column2, true);
      addGrouping(table, column1, false);
      expect(find$aggregateRows(table).length).toBe(2);
      assertGroupingProperty(table, 1);
      assertGroupingValues(table, column3, ['14', '22']);
      assertGroupingValues(table, column4, ['42', '66']);
      removeGrouping(table, column1);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);
    });

    it("may group column 1 and 2 after grouping column 0 first", function() {
      if (!scout.device.supportsInternationalization()) {
        return;
      }
      prepareTable();
      prepareContent();
      render(table);

      expect(find$aggregateRows(table).length).toBe(0);
      addGrouping(table, column0, false);
      addGrouping(table, column2, true);
      addGrouping(table, column1, true);
      removeGrouping(table, column0);
      expect(find$aggregateRows(table).length).toBe(4);
      assertGroupingProperty(table, 1, 2);
      assertGroupingValues(table, column3, ['6', '10', '8', '12']);
      assertGroupingValues(table, column4, ['18', '30', '24', '36']);
      removeGrouping(table, column1);
      removeGrouping(table, column2);
      expect(find$aggregateRows(table).length).toBe(0);
      assertGroupingProperty(table);
    });

  });

  describe('row click', function() {

    function clickRowAndAssertSelection(table, $row) {
      $row.triggerClick();

      var $selectedRows = table.$selectedRows();
      expect($selectedRows.length).toBe(1);

      var $selectedRow = $selectedRows.first();
      expect($selectedRow).toEqual($row);

      expect($selectedRow.hasClass('selected')).toBeTruthy();
      expect($selectedRow.hasClass('select-single')).toBeTruthy();
    }

    it('selects row and unselects others', function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.render();

      var $selectedRows = table.$selectedRows();
      expect($selectedRows.length).toBe(0);

      var $rows = table.$rows();
      clickRowAndAssertSelection(table, $rows.eq(1));
      clickRowAndAssertSelection(table, $rows.eq(2));

      helper.selectRowsAndAssert(table, [model.rows[0], model.rows[4]]);
      clickRowAndAssertSelection(table, $rows.eq(4));
    });

    it("sends selection and click events", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $row = table.$rows().first();
      $row.triggerClick();

      sendQueuedAjaxCalls();

      // clicked has to be after selected otherwise it is not possible to get
      // the selected row in execRowClick
      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['property', 'rowsSelected', 'rowClick']);
    });

    it("sends only click if row already is selected", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $row = table.$rows().first();
      clickRowAndAssertSelection(table, $row);
      sendQueuedAjaxCalls();

      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['property', 'rowsSelected', 'rowClick']);

      // Reset internal state because there is no "sleep" in JS
      table._doubleClickSupport._lastTimestamp -= 5000; // simulate last click 5
      // seconds ago

      jasmine.Ajax.requests.reset();
      clickRowAndAssertSelection(table, $row);
      sendQueuedAjaxCalls();

      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['rowClick']);
    });

    it("sends selection, checked and click events if table is checkable and checkbox has been clicked", function() {
      var model = helper.createModelFixture(2, 5);
      model.checkable = true;
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $checkbox = table.$rows().first().find('.check-box').first();
      $checkbox.triggerClick();

      sendQueuedAjaxCalls();

      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['property', 'rowsSelected', 'rowsChecked', 'rowClick']);
    });

  });

  describe("right click on row", function() {

    afterEach(function() {
      // Close context menus
      removePopups(session);
    });

    it("opens context menu", function() {
      var model = helper.createModelFixture(2, 2);
      var table = helper.createTable(model);
      table.selectedRows = [table.rows[0]];
      table.render();

      var menuModel = helper.createMenuModel('menu'),
        menu = helper.menuHelper.createMenu(menuModel);
      table.menus = [menu];
      var $row0 = table.$data.children('.table-row').eq(0);
      $row0.triggerContextMenu();

      sendQueuedAjaxCalls();

      var $menu = helper.getDisplayingContextMenu(table);
      expect($menu.length).toBeTruthy();
    });

    it("context menu only shows items without header type also if there is a type singleSelection", function() {
      var model = helper.createModelFixture(2, 2);
      var table = helper.createTable(model);
      table.selectedRows = [table.rows[0]];
      table.render();

      var menuModel1 = helper.createMenuModel('menu'),
        menu1 = helper.menuHelper.createMenu(menuModel1),
        menuModel2 = helper.createMenuModelWithSingleAndHeader('menu'),
        menu2 = helper.menuHelper.createMenu(menuModel2);

      table.menus = [menu1, menu2];
      var $row0 = table.$data.children('.table-row').eq(0);
      $row0.triggerContextMenu();

      sendQueuedAjaxCalls();

      var $menu = helper.getDisplayingContextMenu(table);
      expect($menu.find('.menu-item').length).toBe(1);
      expect($menu.find('.menu-item').eq(0).isVisible()).toBe(true);
      expect(menu2.$container).not.toBeDefined();
      expect(menu1.$container).toBeDefined();
    });

    it("context menu only shows visible menus", function() {
      var model = helper.createModelFixture(2, 2);
      var table = helper.createTable(model);
      table.selectedRows = [table.rows[0]];
      table.render();

      var menuModel1 = helper.createMenuModel('menu'),
        menu1 = helper.menuHelper.createMenu(menuModel1),
        menuModel2 = helper.createMenuModel('menu'),
        menu2 = helper.menuHelper.createMenu(menuModel2);
      menu2.visible = false;

      table.menus = [menu1, menu2];
      var $row0 = table.$data.children('.table-row').eq(0);
      $row0.triggerContextMenu();

      sendQueuedAjaxCalls();

      var $menu = helper.getDisplayingContextMenu(table);
      expect($menu.find('.menu-item').length).toBe(1);
      expect($menu.find('.menu-item').eq(0).isVisible()).toBe(true);
    });

  });

  describe("_filterMenus", function() {
    var singleSelMenu, multiSelMenu, bothSelMenu, emptySpaceMenu, headerMenu, table;

    beforeEach(function() {
      var model = helper.createModelFixture(2, 2);
      singleSelMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.SingleSelection']
      });
      multiSelMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.MultiSelection']
      });
      emptySpaceMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.EmptySpace']
      });
      headerMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.Header']
      });
      table = helper.createTable(model);
      table.menus = [singleSelMenu, multiSelMenu, emptySpaceMenu, headerMenu];
    });

    // context menu
    it("returns no menus for contextMenu if no row is selected", function() {
      table.selectRows([]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([]);
    });

    it("returns only single selection menus for contextMenu if one row is selected", function() {
      table.selectRows(table.rows[0]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([singleSelMenu]);
    });

    it("returns only multi selection menus for contextMenu if multiple rows are selected", function() {
      table.selectRows([table.rows[0], table.rows[1]]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([multiSelMenu]);
    });

    it("returns menus with single- and multi selection set for contextMenu if one or more rows are selected", function() {
      bothSelMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.SingleSelection', 'Table.MultiSelection']
      });
      table.menus = [singleSelMenu, multiSelMenu, bothSelMenu];
      table.selectRows(table.rows[0]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([singleSelMenu, bothSelMenu]);

      table.selectRows([table.rows[0], table.rows[1]]);
      menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([multiSelMenu, bothSelMenu]);

      table.selectRows([]);
      menus = table._filterMenus(table.menus, scout.MenuDestinations.CONTEXT_MENU);
      expect(menus).toEqual([]);
    });

    // menuBar
    it("returns only empty space menus if no row is selected", function() {
      table.selectRows([]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([emptySpaceMenu]);
    });

    it("returns empty space and single selection menus if one row is selected", function() {
      table.selectRows(table.rows[0]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([singleSelMenu, emptySpaceMenu]);
    });

    it("returns empty space and multi selection menus if multiple rows are selected", function() {
      table.selectRows([table.rows[0], table.rows[1]]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([multiSelMenu, emptySpaceMenu]);
    });

    it("returns menus with empty space, single- and multi selection set if one or more rows are selected", function() {
      bothSelMenu = helper.menuHelper.createMenu({
        menuTypes: ['Table.SingleSelection', 'Table.MultiSelection']
      });
      table.menus = [singleSelMenu, multiSelMenu, emptySpaceMenu, bothSelMenu];
      table.selectRows(table.rows[0]);
      var menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([singleSelMenu, emptySpaceMenu, bothSelMenu]);

      table.selectRows([table.rows[0], table.rows[1]]);
      menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([multiSelMenu, emptySpaceMenu, bothSelMenu]);

      table.selectRows([]);
      menus = table._filterMenus(table.menus, scout.MenuDestinations.MENU_BAR);
      expect(menus).toEqual([emptySpaceMenu]);
    });
  });

  describe("row mouse down / move / up", function() {

    it("selects multiple rows", function() {
      var model = helper.createModelFixture(2, 5);
      var table = helper.createTable(model);
      table.render();

      var $rows = table.$data.children('.table-row');
      var $row0 = $rows.eq(0);
      var $row1 = $rows.eq(1);
      var $row2 = $rows.eq(2);
      var $row3 = $rows.eq(3);
      var $row4 = $rows.eq(4);

      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('selected');

      $row0.triggerMouseDown();
      $row1.trigger('mouseover');
      $row2.trigger('mouseover');
      $row2.triggerMouseUp();

      expect([$row0, $row1, $row2]).allToHaveClass('selected');
      expect($row0).toHaveClass('select-top');
      expect($row1).toHaveClass('select-middle');
      expect($row2).toHaveClass('select-bottom');

      expect([$row3, $row4]).not.allToHaveClass('selected');
      expect([$row1, $row2, $row3, $row4]).not.anyToHaveClass('select-top');
      expect([$row0, $row2, $row3, $row4]).not.anyToHaveClass('select-middle');
      expect([$row0, $row1, $row3, $row4]).not.anyToHaveClass('select-bottom');
      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('select-single');
    });

    it("only sends selection event, no click", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $rows = table.$data.children('.table-row');
      var $row0 = $rows.eq(0);
      var $row1 = $rows.eq(1);
      var $row2 = $rows.eq(2);

      expect($rows).not.toHaveClass('selected');

      $row0.triggerMouseDown();
      $row1.trigger('mouseover');
      $row2.trigger('mouseover');
      $row2.triggerMouseUp();

      sendQueuedAjaxCalls();

      var requestData = mostRecentJsonRequest();
      // first selection event for first row, second selection event for
      // remaining rows (including first row)
      expect(requestData).toContainEventTypesExactly(['property', 'rowsSelected']);

      var event = [new scout.RemoteEvent(table.id, 'rowsSelected', {
        rowIds: [model.rows[0].id, model.rows[1].id, model.rows[2].id]
      })];
      expect(requestData).toContainEvents(event);
    });

    it("only send one event for mousedown and immediate mouseup on the same row", function() {
      var model = helper.createModelFixture(2, 5);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.render();

      var $rows = table.$data.children('.table-row');
      var $row0 = $rows.eq(0);

      expect($rows).not.toHaveClass('selected');

      $row0.triggerMouseDown();
      $row0.triggerMouseUp();

      sendQueuedAjaxCalls();

      var requestData = mostRecentJsonRequest();
      // exactly only one selection event for first row
      expect(requestData).toContainEventTypesExactly(['property', 'rowsSelected', 'rowClick']);

      var event = [new scout.RemoteEvent(table.id, 'rowsSelected', {
        rowIds: [model.rows[0].id]
      })];
      expect(requestData).toContainEvents(event);
    });

    it("only selects first row if mouse move selection or multi selection is disabled", function() {
      var model = helper.createModelFixture(2, 4);
      var adapter = helper.createTableAdapter(model);
      var table = adapter.createWidget(model, session.desktop);
      table.selectionHandler.mouseMoveSelectionEnabled = false;
      verifyMouseMoveSelectionIsDisabled(model, table, false);

      model = helper.createModelFixture(2, 4);
      model.multiSelect = false;
      adapter = helper.createTableAdapter(model);
      table = adapter.createWidget(model, session.desktop);
      verifyMouseMoveSelectionIsDisabled(model, table, true);
    });

    function verifyMouseMoveSelectionIsDisabled(model, table, selectionMovable) {
      table.render();

      var $rows = table.$data.children('.table-row');
      var $row0 = $rows.eq(0);
      var $row1 = $rows.eq(1);
      var $row2 = $rows.eq(2);

      expect($rows).not.toHaveClass('selected');

      $row0.triggerMouseDown();
      $row1.trigger('mouseover');
      $row2.trigger('mouseover');
      $row2.triggerMouseUp();

      var expectedSelectedRowIndex = (selectionMovable ? 2 : 0);
      for (var i = 0; i < $rows.length; i++) {
        if (i === expectedSelectedRowIndex) {
          expect($rows.eq(i)).toHaveClass('selected');
        } else {
          expect($rows.eq(i)).not.toHaveClass('selected');
        }
      }

      sendQueuedAjaxCalls();

      var requestData = mostRecentJsonRequest();
      var event = new scout.RemoteEvent(table.id, 'rowsSelected', {
        rowIds: [model.rows[expectedSelectedRowIndex].id]
      });
      expect(requestData).toContainEvents(event);
    }

  });

  describe("moveColumn", function() {
    var model, table;

    beforeEach(function() {
      model = helper.createModelFixture(3, 2);
      table = helper.createTable(model);
    });

    it("moves column from oldPos to newPos", function() {
      table.render();

      var $colHeaders = table.header.$container.find('.table-header-item');
      var $header0 = $colHeaders.eq(0);
      var $header1 = $colHeaders.eq(1);
      var $header2 = $colHeaders.eq(2);

      expect(table.columns.indexOf($header0.data('column'))).toBe(0);
      expect(table.columns.indexOf($header1.data('column'))).toBe(1);
      expect(table.columns.indexOf($header2.data('column'))).toBe(2);

      table.moveColumn($header0.data('column'), 0, 2);

      expect(table.columns.indexOf($header1.data('column'))).toBe(0);
      expect(table.columns.indexOf($header2.data('column'))).toBe(1);
      expect(table.columns.indexOf($header0.data('column'))).toBe(2);

      table.moveColumn($header2.data('column'), 1, 0);

      expect(table.columns.indexOf($header2.data('column'))).toBe(0);
      expect(table.columns.indexOf($header1.data('column'))).toBe(1);
      expect(table.columns.indexOf($header0.data('column'))).toBe(2);
    });

    it("considers view range (does not fail if not all rows are rendered)", function() {
      table.viewRangeSize = 1;
      table.render();

      var $rows = table.$rows();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 1));
      expect(table.$rows().length).toBe(1);
      expect(table.rows.length).toBe(2);
      var $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('0_0');
      expect($cells0.eq(1).text()).toBe('0_1');
      expect($cells0.eq(2).text()).toBe('0_2');

      table.moveColumn(table.columns[0], 0, 2);
      $rows = table.$rows();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 1));
      expect($rows.length).toBe(1);
      expect(table.rows.length).toBe(2);
      $cells0 = table.$cellsForRow($rows.eq(0));
      expect($cells0.eq(0).text()).toBe('0_1');
      expect($cells0.eq(1).text()).toBe('0_2');
      expect($cells0.eq(2).text()).toBe('0_0');
    });

  });

  describe("updateRowOrder", function() {
    var model, table, row0, row1, row2;

    beforeEach(function() {
      model = helper.createModelFixture(2, 3);
      table = helper.createTable(model);
      row0 = model.rows[0];
      row1 = model.rows[1];
      row2 = model.rows[2];
    });

    it("correct DOM order for newly inserted rows", function() {
      table.render();
      expect(table.rows.length).toBe(3);
      var newRows = [helper.createModelRow(null, helper.createModelCells(2)), helper.createModelRow(null, helper.createModelCells(2))];
      var orderedRows = [row1, row0, newRows[0], newRows[1], row2];

      // Insert new rows and switch rows 0 and 1
      table.insertRows(newRows);
      table.updateRowOrder(orderedRows);

      // Check if rows were inserted
      expect(table.rows.length).toBe(5);

      // Check if order in the DOM is correct
      // Note: in a previous version of this test we checked if an animation was playing for certain DOM nodes
      // but we must disable jQuery animations completely during test execution, otherwise test will fail, since
      // the complete/done function is scheduled and executed to a time where the test that started the animation
      // is already finished. So this will lead to unpredictable failures.
      var $row, rowId, expectedRowId,
        i = 0,
        $rows = table.$rows();
      $rows.each(function() {
        $row = $(this);
        rowId = $row.data('row').id;
        expectedRowId = orderedRows[i++].id;
        expect(rowId).toBe(expectedRowId);
      });
    });

  });

  describe("initColumns", function() {
    it("sets the column indices if not already set", function() {
      var table = scout.create('Table', {
        parent: session.desktop,
        columns: [{
          objectType: 'Column'
        }, {
          objectType: 'NumberColumn'
        }, {
          objectType: 'NumberColumn'
        }]
      });
      expect(table.columns[0].index).toBe(0);
      expect(table.columns[1].index).toBe(1);
      expect(table.columns[2].index).toBe(2);
    });

    it("does not set the column indices if already set", function() {
      var table = scout.create('Table', {
        parent: session.desktop,
        columns: [{
          objectType: 'Column',
          index: 2
        }, {
          objectType: 'NumberColumn',
          index: 0
        }, {
          objectType: 'NumberColumn',
          index: 1
        }]
      });
      expect(table.columns[0].index).toBe(2);
      expect(table.columns[1].index).toBe(0);
      expect(table.columns[2].index).toBe(1);
    });
  });

  describe("updateColumnStructure", function() {
    var model, table, column0, column1, column2;

    beforeEach(function() {
      model = helper.createModelFixture(3, 2);
      table = helper.createTable(model);
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
    });

    it("resets the model columns", function() {
      table.updateColumnStructure([column2, column1]);

      expect(table.columns.length).toBe(2);
      expect(table.columns[0].id).toBe(column2.id);
      expect(table.columns[1].id).toBe(column1.id);
    });

    it("redraws the header to reflect header cell changes (text)", function() {
      table.render();

      var $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0).text()).toBe(column0.text);
      expect($colHeaders.eq(1).text()).toBe(column1.text);
      expect($colHeaders.eq(2).text()).toBe(column2.text);

      column0.text = 'newColText0';
      column1.text = 'newColText1';
      table.updateColumnStructure([column0, column1, column2]);

      // Check column header text
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0).text()).toBe(column0.text);
      expect($colHeaders.eq(1).text()).toBe(column1.text);
      expect($colHeaders.eq(2).text()).toBe(column2.text);
    });
  });

  describe("updateColumnOrder", function() {
    var model, table, column0, column1, column2;

    beforeEach(function() {
      model = helper.createModelFixture(3, 2);
      table = helper.createTable(model);
      column0 = table.columns[0];
      column1 = table.columns[1];
      column2 = table.columns[2];
    });

    it("reorders the model columns", function() {
      table.updateColumnOrder([column2, column0, column1]);
      expect(table.columns.length).toBe(3);
      expect(table.columns[0]).toBe(column2);
      expect(table.columns[1]).toBe(column0);
      expect(table.columns[2]).toBe(column1);
    });

    it("reorders the html nodes", function() {
      table.render();

      var $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.length).toBe(3);
      expect($colHeaders.eq(0).data('column')).toBe(column0);
      expect($colHeaders.eq(1).data('column')).toBe(column1);
      expect($colHeaders.eq(2).data('column')).toBe(column2);

      var $rows = table.$rows();
      var $cells0 = $rows.eq(0).find('.table-cell');
      var $cells1 = $rows.eq(1).find('.table-cell');

      expect($cells0.eq(0).text()).toBe('0_0');
      expect($cells0.eq(1).text()).toBe('0_1');
      expect($cells0.eq(2).text()).toBe('0_2');
      expect($cells1.eq(0).text()).toBe('1_0');
      expect($cells1.eq(1).text()).toBe('1_1');
      expect($cells1.eq(2).text()).toBe('1_2');

      table.updateColumnOrder([column2, column0, column1]);

      // Check column header order
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.length).toBe(3);
      expect($colHeaders.eq(0).data('column')).toBe(column2);
      expect($colHeaders.eq(1).data('column')).toBe(column0);
      expect($colHeaders.eq(2).data('column')).toBe(column1);

      // Check cells order
      $rows = table.$rows();
      $cells0 = $rows.eq(0).find('.table-cell');
      $cells1 = $rows.eq(1).find('.table-cell');
      expect($cells0.eq(0).text()).toBe('0_2');
      expect($cells0.eq(1).text()).toBe('0_0');
      expect($cells0.eq(2).text()).toBe('0_1');
      expect($cells1.eq(0).text()).toBe('1_2');
      expect($cells1.eq(1).text()).toBe('1_0');
      expect($cells1.eq(2).text()).toBe('1_1');
    });

    it("silently moves cells which are not rendered in view range", function() {
      table.viewRangeSize = 1;
      table.render();
      expect(table.viewRangeRendered).toEqual(new scout.Range(0, 1));

      var $colHeaders = table.header.findHeaderItems();
      var $rows = table.$rows();
      var $cells0 = $rows.eq(0).find('.table-cell');

      expect($rows.length).toBe(1);
      expect(table.rows.length).toBe(2);
      expect($cells0.eq(0).text()).toBe('0_0');
      expect($cells0.eq(1).text()).toBe('0_1');
      expect($cells0.eq(2).text()).toBe('0_2');

      table.updateColumnOrder([column2, column0, column1]);

      // Check column header order
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.length).toBe(3);
      expect($colHeaders.eq(0).data('column')).toBe(column2);
      expect($colHeaders.eq(1).data('column')).toBe(column0);
      expect($colHeaders.eq(2).data('column')).toBe(column1);

      // Check cells order
      $rows = table.$rows();
      expect($rows.length).toBe(1);
      expect(table.rows.length).toBe(2);
      $cells0 = $rows.eq(0).find('.table-cell');
      expect($cells0.eq(0).text()).toBe('0_2');
      expect($cells0.eq(1).text()).toBe('0_0');
      expect($cells0.eq(2).text()).toBe('0_1');
    });

  });

  describe("updateColumnHeaders", function() {
    var model, table, column0, column1, column2;

    beforeEach(function() {
      model = helper.createModelFixture(3, 2);
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
    });

    it("updates the text and sorting state of model columns", function() {
      table = helper.createTable(model);
      var text0 = table.columns[0].text;

      column1 = $.extend({}, table.columns[1]);
      column1.text = 'newText1';
      column1.sortActive = true;
      column1.sortAscending = true;
      column2 = $.extend({}, table.columns[2]);
      column2.text = 'newText2';

      table.updateColumnHeaders([column1, column2]);
      expect(table.columns.length).toBe(3);
      expect(table.columns[0].text).toBe(text0);
      expect(table.columns[1].text).toBe(column1.text);
      expect(table.columns[1].sortAscending).toBe(column1.sortAscending);
      expect(table.columns[1].sortActive).toBe(column1.sortActive);
      expect(table.columns[2].text).toBe(column2.text);
      expect(table.columns[2].sortAscending).toBe(column2.sortAscending);
      expect(table.columns[2].sortActive).toBe(column2.sortActive);
    });

    it("updates sort indices of the sort columns if a sort column got removed", function() {
      model.columns[1].sortActive = true;
      model.columns[1].sortAscending = true;
      model.columns[1].sortIndex = 1;
      model.columns[2].sortActive = true;
      model.columns[2].sortAscending = true;
      model.columns[2].sortIndex = 0;

      table = helper.createTable(model);
      expect(table.columns[1].sortActive).toBe(true);
      expect(table.columns[1].sortAscending).toBe(true);
      expect(table.columns[1].sortIndex).toBe(1);
      expect(table.columns[2].sortActive).toBe(true);
      expect(table.columns[2].sortAscending).toBe(true);
      expect(table.columns[2].sortIndex).toBe(0);

      table.updateColumnHeaders([$.extend({}, table.columns[2], {
        sortActive: false
      })]);
      expect(table.columns[1].sortAscending).toBe(true);
      expect(table.columns[1].sortActive).toBe(true);
      expect(table.columns[1].sortIndex).toBe(0);
      expect(table.columns[2].sortAscending).toBe(true);
      expect(table.columns[2].sortActive).toBe(false);
      expect(table.columns[2].sortIndex).toBe(-1);
    });

    it("updates the text and sorting state of html table header nodes", function() {
      table = helper.createTable(model);
      table.render();

      var $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0).text()).toBe(column0.text);
      expect($colHeaders.eq(1).text()).toBe(column1.text);
      expect($colHeaders.eq(1)).not.toHaveClass('sort-asc');
      expect($colHeaders.eq(2).text()).toBe(column2.text);

      column1 = $.extend({}, table.columns[1]);
      column1.text = 'newText1';
      column1.sortActive = true;
      column1.sortAscending = true;
      column2 = $.extend({}, table.columns[2]);
      column2.text = 'newText2';

      table.updateColumnHeaders([column1, column2]);
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0).text()).toBe(column0.text);
      expect($colHeaders.eq(1).text()).toBe(column1.text);
      expect($colHeaders.eq(1)).toHaveClass('sort-asc');
      expect($colHeaders.eq(2).text()).toBe(column2.text);
    });

    it("updates the custom css class of table header nodes", function() {
      table = helper.createTable(model);
      table.render();

      var $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(1)).not.toHaveClass('custom-header');

      column1 = $.extend({}, table.columns[1]);
      column1.headerCssClass = 'custom-header';
      table.updateColumnHeaders([column1]);
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0)).not.toHaveClass('custom-header');
      expect($colHeaders.eq(1)).toHaveClass('custom-header');

      column1 = $.extend({}, table.columns[1]);
      delete column1.headerCssClass;
      table.updateColumnHeaders([column1]);
      $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0)).not.toHaveClass('custom-header');
      expect($colHeaders.eq(1)).not.toHaveClass('custom-header');
    });

    it("considers html enabled property of table header cells", function() {
      model = helper.createModelFixture(4, 2);
      table = helper.createTable(model);
      column0 = model.columns[0];
      column1 = model.columns[1];
      column2 = model.columns[2];
      var column3 = model.columns[3];

      column0 = helper.createModelColumn('test');
      column0.id = model.columns[0].id;
      column1 = helper.createModelColumn('test');
      column1.headerHtmlEnabled = true;
      column1.id = model.columns[1].id;
      column2 = helper.createModelColumn('<b>test</b>');
      column2.id = model.columns[2].id;
      column3 = helper.createModelColumn('<b>test</b>');
      column3.headerHtmlEnabled = true;
      column3.id = model.columns[3].id;
      table.updateColumnHeaders([column0, column1, column2, column3]);

      table.render();

      var $colHeaders = table.header.findHeaderItems();
      expect($colHeaders.eq(0).text()).toBe('test');
      expect($colHeaders.eq(1).text()).toBe('test');
      expect($colHeaders.eq(2).text()).toBe('<b>test</b>');
      expect($colHeaders.eq(3).text()).toBe('test');
    });
  });

  describe("headerVisible", function() {

    it("hides/shows the table header", function() {
      var model = helper.createModelFixture(2);
      var table = helper.createTable(model);
      table.render();

      expect(table.header).toBeTruthy();
      table.setHeaderVisible(false);
      expect(table.header).toBeFalsy();
    });

  });

  describe("View range markers", function() {

    // Test case for ticket #216194
    it("Must not throw an error when called in detached state", function() {

      // delete second row (which has never been rendered, row.$row is not set)
      // this was the first bug corrected in ticket #216194 and was solved
      // in _removeRows by only doing consistency checks when table is attached
      runTest(1);

      // delete first row
      // this was the second bug corrected in ticket #216194 and was solved
      // when render/removeRangeMarker handled a row that was never rendered
      // add/removeClass calls failed with an error
      runTest(0);

      // Simply expect no error was thrown (can be replaced with expect().nothing()
      // in newer Jasmine versions). This is just to avoid the 'no expectations'
      // warning in the console.
      expect(true).toBeTruthy();

      function runTest(rowToDeleteIndex) {
        var model = helper.createModelFixture(1, 1);
        model.viewRangeSize = 3;
        var table = helper.createTable(model);
        table.render();
        table.detach();

        // Add rows while we're in detached state
        var rows = [];
        for (var i = 0; i < 4; i++) {
          rows.push(helper.createModelRow(i));
        }
        table.insertRows(rows);
        // Show rows 0, 1 and 2 - row 3 is out of view range
        // this is normally set by the TableLayout
        table.viewRangeRendered = new scout.Range(0, 2);

        setTimeout(function() {
          table.deleteRow(table.filteredRows()[rowToDeleteIndex]);
        });

        jasmine.clock().tick();
      }
    });

  });

  describe("Column visibility", function() {

    it("update headers and rows when visibility of a column changes", function() {
      var model = helper.createModelFixture(2, 1);
      var table = helper.createTable(model);
      table.render();

      expect(table.columns[0].isVisible()).toBe(true);
      expect(table.columns[1].isVisible()).toBe(true);
      expect(table.$container.find('.table-header-item:not(.filler)').length).toBe(2);
      expect(table.$container.find('.table-cell').length).toBe(2);

      table.columns[1].setVisible(false);

      // when column is invisible it must be removed from the header
      // also the cells of this column must be removed from all table rows
      expect(table.columns[0].isVisible()).toBe(true);
      expect(table.columns[1].isVisible()).toBe(false);
      expect(table.$container.find('.table-header-item:not(.filler)').length).toBe(1);
      expect(table.$container.find('.table-cell').length).toBe(1);
    });

    it("visibleColumns() only return visible columns", function() {
      var model = helper.createModelFixture(2, 1);
      var table = helper.createTable(model);

      expect(table.columns.length).toBe(2);
      expect(table.visibleColumns().length).toBe(2);

      table.columns[0].setVisible(false);

      expect(table.columns.length).toBe(2);
      expect(table.visibleColumns().length).toBe(1);
    });

    it("moveColumn() must deal with different indices for visible and all columns", function() {
      var model = helper.createModelFixture(3, 1);
      var table = helper.createTable(model);
      var colA = table.columns[0];
      var colB = table.columns[1];
      var colC = table.columns[2];

      colB.setVisible(false); // column in the middle is invisible
      expect(table.visibleColumns().length).toBe(2);

      table.moveColumn(colC, 1, 0); // move C to be the first column
      expect(table.visibleColumns()).toEqual([colC, colA]);
      expect(table.columns).toEqual([colC, colA, colB]);

      table.moveColumn(colC, 0, 1); // move C to be the last column
      expect(table.visibleColumns()).toEqual([colA, colC]);
      expect(table.columns).toEqual([colA, colC, colB]);
    });

  });

});
