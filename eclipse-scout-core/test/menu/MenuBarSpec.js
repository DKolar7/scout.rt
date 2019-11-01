/*
 * Copyright (c) 2010-2019 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {Action, Button, ButtonAdapterMenu, Dimension, GroupBoxMenuItemsOrder, HtmlComponent, MenuBar, MenuItemsOrder, menus, scout} from '../../src/index';
import {MenuSpecHelper} from '@eclipse-scout/testing';


describe("MenuBar", function() {
  var helper, session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new MenuSpecHelper(session);
    $('<style>' +
      '.menubar { overflow: hidden; background-color: red; padding: 5px; }' +
      '.menubar > .menubox { display: inline-block; height: 100% }' +
      '.menubar > .menubox.right { float:right }' +
      '.menu-item { min-width: 110px; max-width: 110px; padding: 5px; display: inline-block; background-color: orange;}' +
      '</style>').appendTo($('#sandbox'));
  });

  function createModel(text, iconId, menuTypes) {
    text = scout.nvl(text, 'Foo');
    menuTypes = scout.nvl(menuTypes, ['Table.EmptySpace']);
    return helper.createModel(text, iconId, menuTypes);
  }

  function createMenuBar(menuOrder) {
    return scout.create('MenuBar', {
      parent: session.desktop,
      menuOrder: scout.nvl(menuOrder, new MenuItemsOrder(session, 'Table'))
    });
  }

  describe('setMenuItems', function() {

    it('prefers EmptySpace for the left position if menu has multiple menuTypes', function() {
      var menu1 = helper.createMenu(helper.createModel('multi')),
        menu2 = helper.createMenu(helper.createModel('selection')),
        menuBar = createMenuBar(),
        menus = [menu2, menu1];

      menu1.menuTypes = ['Table.EmptySpace', 'Table.SingleSelection'];
      menu2.menuTypes = ['Table.SingleSelection'];

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.orderedMenuItems.all.length).toBe(4); // 2 + separator + ellipsis
      expect(menuBar.orderedMenuItems.all[0]).toBe(menu1);
      expect(menuBar.orderedMenuItems.all.map(function(mi) {
        return mi.separator;
      })).toEqual([false, true, false, false]);
      expect(menuBar.orderedMenuItems.all.map(function(mi) {
        return mi.ellipsis;
      })).toEqual([undefined, undefined, undefined, true]);
    });

    it('must add/destroy dynamically created separators', function() {
      var separator,
        menu1 = helper.createMenu(createModel('empty')),
        menu2 = helper.createMenu(createModel('selection-1', null, ['Table.SingleSelection'])),
        menu3 = helper.createMenu(createModel('selection-2', null, ['Table.SingleSelection'])),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menuBar.render();
      menuBar.setMenuItems(menus);

      // a separator must be added between EmptySpace and Selection Menus and ellipsis at the end
      expect(menuBar.orderedMenuItems.all.length).toBe(4);
      separator = menuBar.orderedMenuItems.all[1];
      expect(separator.separator).toBe(true);
      expect(separator.createdBy).toBe(menuBar.menuSorter);

      // when menu-bar is updated, the old separator must be destroyed
      // and a new separator with different ID should be created
      menus = [menu1, menu3];
      menuBar.setMenuItems(menus);
      expect(separator.rendered).toBe(false);
      expect(separator.id).not.toBe(menuBar.orderedMenuItems.all[1].id);
    });

    it('renders menu bar invisible if no visible menu items are available', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = false;
      menu2.visible = false;

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.$container.isVisible()).toBe(false);
    });

    it('renders menu bar visible if at least one visible menu item is available', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = false;
      menu2.visible = true;

      menuBar.render();
      menuBar.setMenuItems(menus);

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.$container.isVisible()).toBe(true);
    });

    it('hides unnecessary explicit separator menus', function() {
      var menuModel = helper.createModel();
      menuModel.menuTypes = ['Table.EmptySpace'];

      var sep1a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep1a', separator: true}));
      var sep1b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep1b', separator: true}));
      var menu1 = helper.createMenu($.extend({}, menuModel, {id: 'test.menu1', text: 'Menu 1 (L)'}));
      var sep12a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep12a', separator: true}));
      var sep12b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep12b', separator: true, menuTypes: ['Table.SingleSelection']})); // <-- will generate an additional artificial separator menu
      var menu2 = helper.createMenu($.extend({}, menuModel, {id: 'test.menu2', text: 'Menu 2 (L)', menuTypes: ['Table.SingleSelection']}));
      var sep2a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep2a', separator: true, menuTypes: ['Table.SingleSelection']}));
      var sep2b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep2b', separator: true, menuTypes: ['Table.SingleSelection']}));

      var sep3a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep3a', horizontalAlignment: 1, separator: true}));
      var sep3b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep3b', horizontalAlignment: 1, separator: true}));
      var menu3 = helper.createMenu($.extend({}, menuModel, {id: 'test.menu3', horizontalAlignment: 1, text: 'Menu 3 (R)'}));
      var sep34a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep34a', horizontalAlignment: 1, separator: true}));
      var sep34b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep34b', horizontalAlignment: 1, separator: true}));
      var menu4 = helper.createMenu($.extend({}, menuModel, {id: 'test.menu4', horizontalAlignment: 1, text: 'Menu 4 (R)'}));
      var sep4a = helper.createMenu($.extend({}, menuModel, {id: 'test.sep4a', horizontalAlignment: 1, separator: true}));
      var sep4b = helper.createMenu($.extend({}, menuModel, {id: 'test.sep4b', horizontalAlignment: 1, separator: true}));

      var menuBar = createMenuBar();
      menuBar.render();
      menuBar.setMenuItems([
        sep1a, sep1b, menu1, sep12a, sep12b, menu2, sep2a, sep2b,
        sep3a, sep3b, menu3, sep34a, sep34b, menu4, sep4a, sep4b
      ]);

      expect(menuBar.orderedMenuItems.all.length).toBe(18); // all menus + one artificial separator menu + one artificial ellipsis menu
      expect(menuBar.orderedMenuItems.left.length).toBe(9);
      expect(menuBar.orderedMenuItems.right.length).toBe(9);

      function listVisibleMenuIds(menus) {
        return menus
          .filter(function(menu) {
            return menu.visible && !menu.ellipsis;
          })
          .map(function(menu) {
            return menu.id;
          })
          .join(', ');
      }

      expect(listVisibleMenuIds(menuBar.orderedMenuItems.all)).toBe('test.menu1, test.sep12b, test.menu2, test.menu3, test.sep34b, test.menu4');
      expect(listVisibleMenuIds(menuBar.orderedMenuItems.left)).toBe('test.menu1, test.sep12b, test.menu2');
      expect(listVisibleMenuIds(menuBar.orderedMenuItems.right)).toBe('test.menu3, test.sep34b, test.menu4');
    });

  });

  describe('focus', function() {
    it('MenuBar must update tabbable when a menu item is focused', function() {
      // otherwise the menu item can not have the focus, because the DOM element is not focusable without a tabindex.
      var menuModel = helper.createModel();
      menuModel.menuTypes = ['Table.EmptySpace'];

      var menu1 = helper.createMenu($.extend({}, menuModel, {id: 'menu1', text: 'Menu 1'}));
      var menu2 = helper.createMenu($.extend({}, menuModel, {id: 'menu2', text: 'Menu 2'}));

      var menuBar = createMenuBar();
      menuBar.render();
      menuBar.setMenuItems([menu1, menu2]);

      menu1.focus();
      expect(menu1.$container.attr('tabindex')).toBe('0');
      expect(menu2.$container.attr('tabindex')).toBe(undefined);

      menu2.focus();
      expect(menu1.$container.attr('tabindex')).toBe(undefined);
      expect(menu2.$container.attr('tabindex')).toBe('0');
    });
  });

  describe('propertyChange', function() {
    var menu, menuBar;

    beforeEach(function() {
      menu = helper.createMenu(createModel('foo'));
      menuBar = createMenuBar();
    });

    it('must listen on property changes of its menu items (even when menu bar is not rendered)', function() {
      menu.visible = false;
      menuBar.setMenuItems([menu]);
      expect(menuBar.visible).toBe(false);

      menu.setVisible(true);
      expect(menuBar.visible).toBe(true);

      menu.setVisible(false);
      expect(menuBar.visible).toBe(false);
    });

    // Note: the menu alone has already an event listener
    it('must remove property-change and focus listeners on destroy', function() {
      expect(menu.events.count()).toBe(1);

      menuBar.setMenuItems([menu]);
      expect(menu.events.count()).toBe(3);

      menuBar.destroy();
      expect(menu.events.count()).toBe(1);
    });

    it('automatically hides unused separators', function() {
      var menu1 = helper.createMenu(createModel('Menu 1'));
      var menu2 = helper.createMenu(createModel('Menu 2'));
      var menu3 = helper.createMenu(createModel('Menu 3'));
      var separator = helper.createMenu($.extend({}, createModel(), {separator: true}));

      var menuBar = createMenuBar();
      menuBar.render();
      menuBar.setMenuItems([menu1, separator, menu2, menu3]);

      expect(menuBar.orderedMenuItems.all.length).toBeGreaterThanOrEqual(4); // because the elements have no real size, an artificial EllipsisMenu might be added
      expect(menuBar.orderedMenuItems.all[0]).toBe(menu1);
      expect(menuBar.orderedMenuItems.all[1]).toBe(separator);
      expect(menuBar.orderedMenuItems.all[2]).toBe(menu2);
      expect(menuBar.orderedMenuItems.all[3]).toBe(menu3);

      menu2.setVisible(false);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(true);
      expect(menu2.visible).toBe(false); // <--
      expect(menu3.visible).toBe(true);

      menu3.setVisible(false);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(false); // <--
      expect(menu2.visible).toBe(false);
      expect(menu3.visible).toBe(false); // <--

      menuBar.remove();
      menu2.setVisible(true);
      expect(menu1.visible).toBe(true);
      expect(separator.visible).toBe(true); // <--
      expect(menu2.visible).toBe(true); // <--
      expect(menu3.visible).toBe(false);

      menuBar.render();
      expect(menu1.$container.isVisible()).toBe(true);
      expect(separator.$container.isVisible()).toBe(true);
      expect(menu2.$container.isVisible()).toBe(true);
      expect(menu3.$container.isVisible()).toBe(false);
    });
  });

  describe('setVisible', function() {
    it('does not throw an error if called on menus moved to the ellipsis menu', function() {
      var menu1 = helper.createMenu(createModel('foo')),
        menu2 = helper.createMenu(createModel('bar')),
        menuBar = createMenuBar();

      var menu3model = createModel('boo');
      menu3model.visible = false;
      var menu3 = helper.createMenu(menu3model);

      var menu4model = createModel('far');
      menu4model.horizontalAlignment = 1;
      var menu4 = helper.createMenu(menu4model);

      var menus = [menu1, menu2, menu3, menu4];

      menuBar.setMenuItems(menus);
      menuBar.render();
      menuBar.htmlComp.setSize(new Dimension(100, 50));

      menu3.setVisible(true);
      menuBar.validateLayout();

      // no error is thrown.
      expect(true).toBe(true);
    });
  });

  describe('layout', function() {
    it('gets invalidated if a menu changes its visibility', function() {
      var menu1 = helper.createMenu(createModel('foo')),
        menu2 = helper.createMenu(createModel('bar')),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menu1.visible = true;
      menu2.visible = true;
      menuBar.setMenuItems(menus);
      menuBar.render();
      menuBar.htmlComp.setSize(new Dimension(500, 50));

      expect(menu1.$container.isVisible()).toBe(true);
      expect(HtmlComponent.get(menuBar.$container).valid).toBe(true);

      menu1.setProperty('visible', false);

      expect(menu1.$container.isVisible()).toBe(false);
      expect(HtmlComponent.get(menuBar.$container).valid).toBe(false);
    });
  });

  describe('updateDefaultMenu', function() {
    it('marks first visible and enabled menu that reacts to ENTER keystroke as default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menus = [menu1, menu2];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(2);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);

      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).toHaveClass('default-menu');
    });

    it('marks ButtonAdapterMenu that reacts to ENTER keystroke as default menu', function() {
      var button = new Button();
      button.init({
        id: '123',
        parent: session.desktop
      });
      var adapterMenu = new ButtonAdapterMenu();
      adapterMenu.init({
        id: '234',
        button: button,
        parent: session.desktop
      });

      button.setProperty('defaultButton', false);
      button.setProperty('keyStroke', 'enter');

      var menuBar = createMenuBar(new GroupBoxMenuItemsOrder()),
        menus = [adapterMenu];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(1);
      expect(menuBar.menuItems[0]).toBe(adapterMenu);

      expect(adapterMenu.$container).toHaveClass('default-menu');
    });

    it('marks first visible and enabled menu that has the "defaultMenu" flag set as default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      var modelMenu3 = createModel('bla');
      var modelMenu4 = createModel('xyz');
      var modelMenu5 = createModel('qux');
      var modelMenu6 = createModel('fum');
      // menu2 should not have the default menu class since the default menu is set to false
      modelMenu2.keyStroke = 'enter';
      modelMenu2.defaultMenu = false;
      // menu3 should have  the default menu class but is not the default menu of the menu bar since it is disabled
      modelMenu3.defaultMenu = true;
      modelMenu3.enabled = false;
      // menu4 has the default menu class and is the default menu of the menu bar.
      modelMenu4.defaultMenu = true;
      // menu5 should have the default menu class but is not the default menu in the menu bar.
      modelMenu5.defaultMenu = true;
      // menu6 should have the default menu class but is not the default menu in the menu bar.
      modelMenu6.keyStroke = 'enter';

      var menuBar = createMenuBar(),
        menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menu3 = helper.createMenu(modelMenu3),
        menu4 = helper.createMenu(modelMenu4),
        menu5 = helper.createMenu(modelMenu5),
        menu6 = helper.createMenu(modelMenu6),
        menus = [menu1, menu2, menu3, menu4, menu5, menu6];

      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar.menuItems.length).toBe(6);
      expect(menuBar.menuItems[0]).toBe(menu1);
      expect(menuBar.menuItems[1]).toBe(menu2);
      expect(menuBar.menuItems[2]).toBe(menu3);
      expect(menuBar.menuItems[3]).toBe(menu4);
      expect(menuBar.menuItems[4]).toBe(menu5);
      expect(menuBar.menuItems[5]).toBe(menu6);

      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');
      expect(menu3.$container).not.toHaveClass('default-menu');
      expect(menu4.$container).toHaveClass('default-menu');
      expect(menu5.$container).not.toHaveClass('default-menu');
      expect(menu6.$container).not.toHaveClass('default-menu');
      expect(menu4).toBe(menuBar.defaultMenu);
    });

    it('updates state if menu gets enabled or disabled', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menusItems = [menu1, menu2];

      var ellipsisMenu = menus.createEllipsisMenu({
        parent: session.desktop
      });
      ellipsisMenu.render();

      menuBar.setMenuItems(menusItems);
      menuBar.render();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');

      menu2.setProperty('enabled', false);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu2.$container).not.toHaveClass('default-menu');

      menu2.setProperty('enabled', true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');
    });

    it('updates state if keyStroke or defaultMenu property of menu changes', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menuItems = [menu1, menu2];

      var ellipsisMenu = menus.createEllipsisMenu({
        parent: session.desktop
      });
      ellipsisMenu.render();

      menuBar.setMenuItems(menuItems);
      menuBar.render();
      expect(menu1.rendered).toBe(true);
      expect(menu2.rendered).toBe(true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).toHaveClass('default-menu');

      menu2.setProperty('keyStroke', null);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');

      menu1.setProperty('keyStroke', 'enter');
      expect(menuBar.defaultMenu).toBe(menu1);
      expect(menu1.$container).toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');

      menu2.setProperty('defaultMenu', true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).toHaveClass('default-menu');

      menu1.setProperty('defaultMenu', false);
      menu2.setProperty('defaultMenu', false);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');

      menu1.setProperty('defaultMenu', undefined);
      menu2.setProperty('defaultMenu', undefined);
      expect(menuBar.defaultMenu).toBe(menu1);
      expect(menu1.$container).toHaveClass('default-menu');
      expect(menu2.$container).not.toHaveClass('default-menu');
    });

    it('considers rendered state of default menu', function() {
      var modelMenu1 = createModel('foo');
      var modelMenu2 = createModel('bar');
      modelMenu2.keyStroke = 'enter';

      var menu1 = helper.createMenu(modelMenu1),
        menu2 = helper.createMenu(modelMenu2),
        menuBar = createMenuBar(),
        menuItems = [menu1, menu2];

      var ellipsisMenu = menus.createEllipsisMenu({
        parent: session.desktop
      });
      ellipsisMenu.render();

      menuBar.setMenuItems(menuItems);
      menuBar.render();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.$container).toHaveClass('default-menu');

      // Move default menu into ellipsis and call updateDefaultMenu explicitly to recalculate state
      menus.moveMenuIntoEllipsis(menu2, ellipsisMenu);
      menuBar.updateDefaultMenu();
      expect(menu1.rendered).toBe(true);
      expect(menu1.$container).not.toHaveClass('default-menu');
      expect(menu2.rendered).toBe(false);
      expect(menuBar.defaultMenu).toBe(menu2);

      menu2.setProperty('enabled', false);
      expect(menuBar.defaultMenu).toBe(null);
      expect(menu2.rendered).toBe(false);

      menu2.setProperty('enabled', true);
      expect(menuBar.defaultMenu).toBe(menu2);
      expect(menu2.rendered).toBe(false);
    });
  });

  describe('ellipsis position', function() {
    it('is calculated correctly for ellipsisPosition RIGHT', function() {
      var rightMenu1 = helper.createMenu(createModel('foo')),
        rightMenu2 = helper.createMenu(createModel('bar')),
        leftMenu1 = helper.createMenu(createModel('foo')),
        leftMenu2 = helper.createMenu(createModel('bar')),
        menuBar = createMenuBar(),
        menus = [rightMenu1, rightMenu2, leftMenu1, leftMenu2];

      rightMenu1.visible = true;
      rightMenu1.horizontalAlignment = 1;
      rightMenu2.visible = false;
      rightMenu2.horizontalAlignment = 1;
      leftMenu1.visible = true;
      leftMenu1.horizontalAlignment = -1;
      leftMenu2.visible = true;
      leftMenu2.horizontalAlignment = -1;
      menuBar.setEllipsisPosition(MenuBar.EllipsisPosition.RIGHT);
      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar._ellipsis.rightAligned).toBe(true);
      expect(menuBar.orderedMenuItems.right[0]).toBe(rightMenu1);
      expect(menuBar.orderedMenuItems.right[1]).toBe(menuBar._ellipsis);
      expect(menuBar.orderedMenuItems.right[2]).toBe(rightMenu2);

      rightMenu2.setProperty('visible', true);

      expect(menuBar._ellipsis.rightAligned).toBe(true);
      expect(menuBar.orderedMenuItems.right[0]).toBe(rightMenu1);
      expect(menuBar.orderedMenuItems.right[1]).toBe(rightMenu2);
      expect(menuBar.orderedMenuItems.right[2]).toBe(menuBar._ellipsis);

      rightMenu1.setProperty('visible', false);
      rightMenu2.setProperty('visible', false);

      expect(menuBar._ellipsis.rightAligned).toBe(false);
      expect(menuBar.orderedMenuItems.left[0]).toBe(leftMenu1);
      expect(menuBar.orderedMenuItems.left[1]).toBe(leftMenu2);
      expect(menuBar.orderedMenuItems.left[2]).toBe(menuBar._ellipsis);
    });

    it('is calculated correctly for ellipsisPosition LEFT', function() {
      var rightMenu1 = helper.createMenu(createModel('foo')),
        rightMenu2 = helper.createMenu(createModel('bar')),
        leftMenu1 = helper.createMenu(createModel('foo')),
        leftMenu2 = helper.createMenu(createModel('bar')),
        menuBar = createMenuBar(),
        menus = [rightMenu1, rightMenu2, leftMenu1, leftMenu2];

      rightMenu1.visible = true;
      rightMenu1.horizontalAlignment = 1;
      rightMenu2.visible = true;
      rightMenu2.horizontalAlignment = 1;
      leftMenu1.visible = false;
      leftMenu1.horizontalAlignment = -1;
      leftMenu2.visible = true;
      leftMenu2.horizontalAlignment = -1;
      menuBar.setEllipsisPosition(MenuBar.EllipsisPosition.LEFT);
      menuBar.setMenuItems(menus);
      menuBar.render();

      expect(menuBar._ellipsis.rightAligned).toBe(false);
      expect(menuBar.orderedMenuItems.left[0]).toBe(leftMenu1);
      expect(menuBar.orderedMenuItems.left[1]).toBe(menuBar._ellipsis);
      expect(menuBar.orderedMenuItems.left[2]).toBe(leftMenu2);

      leftMenu1.setProperty('visible', true);

      expect(menuBar._ellipsis.rightAligned).toBe(false);
      expect(menuBar.orderedMenuItems.left[0]).toBe(menuBar._ellipsis);
      expect(menuBar.orderedMenuItems.left[1]).toBe(leftMenu1);
      expect(menuBar.orderedMenuItems.left[2]).toBe(leftMenu2);

      leftMenu1.setProperty('visible', false);
      leftMenu2.setProperty('visible', false);

      expect(menuBar._ellipsis.rightAligned).toBe(true);
      expect(menuBar.orderedMenuItems.right[0]).toBe(menuBar._ellipsis);
      expect(menuBar.orderedMenuItems.right[1]).toBe(rightMenu1);
      expect(menuBar.orderedMenuItems.right[2]).toBe(rightMenu2);
    });
  });

  describe('reorderMenus', function() {
    it('updates left-of-button correctly', function() {
      var button1 = scout.create('Menu', {
          parent: session.desktop,
          actionStyle: Action.ActionStyle.BUTTON
        }),
        button2 = scout.create('Menu', {
          parent: session.desktop,
          actionStyle: Action.ActionStyle.BUTTON
        }),
        menuBar = createMenuBar(),
        menus = [button1, button2];

      menuBar.setMenuItems(menus);
      menuBar.render();
      expect(button1.$container).toHaveClass('left-of-button');
      expect(button2.$container).not.toHaveClass('left-of-button');

      menuBar.reorderMenus();
      expect(button1.$container).toHaveClass('left-of-button');
      expect(button2.$container).not.toHaveClass('left-of-button');
    });

    it('updates last correctly', function() {
      var button1 = scout.create('Menu', {
          parent: session.desktop,
          actionStyle: Action.ActionStyle.BUTTON
        }),
        button2 = scout.create('Menu', {
          parent: session.desktop,
          actionStyle: Action.ActionStyle.BUTTON
        }),
        menuBar = createMenuBar(),
        menus = [button1, button2];

      menuBar.setMenuItems(menus);
      menuBar.render();
      menuBar.validateLayout();
      expect(button1.$container).not.toHaveClass('last');
      expect(button2.$container).toHaveClass('last');

      menuBar.reorderMenus();
      menuBar.validateLayout();
      expect(button1.$container).not.toHaveClass('last');
      expect(button2.$container).toHaveClass('last');
    });
  });
});
