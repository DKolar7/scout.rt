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
describe("TableHeaderSpec", function() {
  var session;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new scout.TableSpecHelper(session);
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  describe("render", function() {

    it("attaches listener to the table but only once", function() {
      var model = helper.createModelFixture(2);
      var table = helper.createTable(model);
      table.render();
      expect(table.header).not.toBeUndefined();
      var listenerCount = table.events._eventListeners.length;

      table.setHeaderVisible(false);
      table.setHeaderVisible(true);

      // Still same amount of listeners expected after header visibility changed
      expect(table.events._eventListeners.length).toBe(listenerCount);
    });

  });

  it('hiddenByUi', function() {
    var table = helper.createTableWithOneColumn();
    table.setMenus([scout.create('Menu', { // fake header menu required to properly calculate visibility
      parent: table,
      text: 'Foo',
      menuTypes: ['Table.Header']
    })]);
    table.render();

    expect(table.header.menuBar.hiddenByUi).toBe(false);
    expect(table.header.menuBar.visible).toBe(true);
    table.setHeaderEnabled(false);
    expect(table.header.menuBar.hiddenByUi).toBe(true);
    expect(table.header.menuBar.visible).toBe(false);
    table.setHeaderEnabled(true);
    expect(table.header.menuBar.hiddenByUi).toBe(false);
    expect(table.header.menuBar.visible).toBe(true);
  });

});
