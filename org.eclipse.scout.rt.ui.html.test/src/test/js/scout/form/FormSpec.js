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
describe('Form', function() {
  var session, helper, outlineHelper;

  beforeEach(function() {
    setFixtures(sandbox());
    jasmine.Ajax.install();
    jasmine.clock().install();
    session = sandboxSession({
      desktop: {
        headerVisible: true,
        navigationVisible: true,
        benchVisible: true
      }
    });
    helper = new scout.FormSpecHelper(session);
    outlineHelper = new scout.OutlineSpecHelper(session);
    uninstallUnloadHandlers(session);
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  describe('init', function() {
    it('marks the root group box as main box', function() {
      var form = scout.create('Form', {
        parent: session.desktop,
        rootGroupBox: {
          objectType: 'GroupBox',
          fields: [{
            objectType: 'GroupBox'
          }]
        }
      });
      expect(form.rootGroupBox.mainBox).toBe(true);
      expect(form.rootGroupBox.fields[0].mainBox).toBe(false);
    });
  });

  describe('open', function() {

    it('opens the form', function() {
      var form = helper.createFormWithOneField();
      form.open();
      expect(form.rendered).toBe(true);
      expect(session.desktop.dialogs.indexOf(form) > -1).toBe(true);
    });

    it('adds it to the display parent', function() {
      var parentForm = helper.createFormWithOneField();
      parentForm.open();
      expect(session.desktop.dialogs.indexOf(parentForm) > -1).toBe(true);

      var form = helper.createFormWithOneField();
      form.displayParent = parentForm;
      form.open();
      expect(form.rendered).toBe(true);
      expect(session.desktop.dialogs.indexOf(form) > -1).toBe(false);
      expect(parentForm.dialogs.indexOf(form) > -1).toBe(true);
    });

  });

  describe('close', function() {

    it('closes the form', function() {
      var form = helper.createFormWithOneField();
      form.open();
      form.close();
      expect(session.desktop.dialogs.indexOf(form) > -1).toBe(false);
      expect(form.rendered).toBe(false);
      expect(form.destroyed).toBe(true);
    });

    it('removes it from the display parent', function() {
      var parentForm = helper.createFormWithOneField();
      parentForm.open();

      var form = helper.createFormWithOneField();
      form.displayParent = parentForm;
      form.open();
      expect(parentForm.dialogs.indexOf(form) > -1).toBe(true);

      form.close();
      expect(parentForm.dialogs.indexOf(form) > -1).toBe(false);
      expect(form.rendered).toBe(false);
      expect(form.destroyed).toBe(true);
    });

  });

  describe('abort', function() {

    it('closes the form if there is a close button', function() {
      var form = scout.create('Form', {
        parent: session.desktop,
        rootGroupBox: {
          objectType: 'GroupBox',
          menus: [{
            objectType: 'CloseMenu',
          }]
        }
      });
      spyOn(form, 'close').and.callThrough();
      spyOn(form, 'cancel').and.callThrough();
      form.open();
      form.abort();
      expect(form.close.calls.count()).toEqual(1);
      expect(form.cancel.calls.count()).toEqual(0);
      expect(form.destroyed).toBe(true);
    });

    it('closes the form by using cancel if there is no close button', function() {
      var form = scout.create('Form', {
        parent: session.desktop,
        rootGroupBox: {
          objectType: 'GroupBox'
        }
      });
      spyOn(form, 'close').and.callThrough();
      spyOn(form, 'cancel').and.callThrough();
      form.open();
      form.abort();
      expect(form.close.calls.count()).toEqual(0);
      expect(form.cancel.calls.count()).toEqual(1);
      expect(form.destroyed).toBe(true);
    });

  });

  describe('destroy', function() {

    it('destroys its children', function() {
      var form = helper.createFormWithOneField();

      expect(form.rootGroupBox).toBeTruthy();
      expect(form.rootGroupBox.fields[0]).toBeTruthy();

      form.destroy();
      expect(form.rootGroupBox.destroyed).toBeTruthy();
      expect(form.rootGroupBox.fields[0].destroyed).toBeTruthy();
    });

  });

  describe('cacheBounds', function() {

    var form;

    beforeEach(function() {
      form = helper.createFormWithOneField();
      form.cacheBounds = true;
      form.cacheBoundsKey = 'FOO';
      form.render();

      scout.webstorage.removeItem(localStorage, 'scout:formBounds:FOO');
    });

    it('read and store bounds', function() {
      // should return null when local storage not contains the requested key
      expect(form.readCacheBounds()).toBe(null);

      // should return the stored Rectangle
      var storeBounds = new scout.Rectangle(0, 1, 2, 3);
      form.storeCacheBounds(storeBounds);
      var readBounds = form.readCacheBounds();
      expect(readBounds).toEqual(storeBounds);
    });

    it('update bounds - if cacheBounds is true', function() {
      form.updateCacheBounds();
      expect(form.readCacheBounds() instanceof scout.Rectangle).toBe(true);
    });

    it('update bounds - if cacheBounds is false', function() {
      form.cacheBounds = false;
      form.updateCacheBounds();
      expect(form.readCacheBounds()).toBe(null);
    });

  });

  describe('modal', function() {

    it('creates a glass pane if true', function() {
      var form = helper.createFormWithOneField({
        modal: true
      });
      form.open();
      expect($('.glasspane').length).toBe(3);
      form.close();
      expect($('.glasspane').length).toBe(0);
    });

    it('does not create a glass pane if false', function() {
      var form = helper.createFormWithOneField({
        modal: false
      });
      form.open();
      expect($('.glasspane').length).toBe(0);
      form.close();
      expect($('.glasspane').length).toBe(0);
    });

  });

  describe('displayParent', function() {
    var desktop;

    beforeEach(function() {
      desktop = session.desktop;
    });

    it('is required if form is managed by a form controller, defaults to desktop', function() {
      var form = helper.createFormWithOneField();
      expect(form.displayParent).toBeUndefined();
      form.open();
      expect(form.displayParent).toBe(desktop);
      form.close();
    });

    it('is not required if form is just rendered', function() {
      var form = helper.createFormWithOneField();
      expect(form.displayParent).toBeUndefined();
      form.render();
      expect(form.displayParent).toBeUndefined();
      form.destroy();
    });

    it('always same as parent if display parent is set', function() {
      // Parent would be something different, removing the parent would remove the form which is not expected, because only removing the display parent has to remove the form
      var initialParent = new scout.NullWidget();
      var form = helper.createFormWithOneField({
        parent: initialParent,
        session: session
      });
      expect(form.displayParent).toBeUndefined();
      expect(form.parent).toBe(initialParent);
      form.open();
      expect(form.displayParent).toBe(desktop);
      expect(form.parent).toBe(desktop);
      form.close();
    });

    it('blocks desktop if modal and displayParent is desktop', function() {
      var form = helper.createFormWithOneField({
        modal: true,
        displayParent: desktop
      });
      form.open();
      expect($('.glasspane').length).toBe(3);
      expect(desktop.navigation.$container.children('.glasspane').length).toBe(1);
      expect(desktop.bench.$container.children('.glasspane').length).toBe(1);
      expect(desktop.header.$container.children('.glasspane').length).toBe(1);
      form.close();
      expect($('.glasspane').length).toBe(0);
    });

    it('blocks detail form and outline if modal and displayParent is outline', function() {
      var outline = outlineHelper.createOutlineWithOneDetailForm();
      desktop.setOutline(outline);
      outline.selectNodes(outline.nodes[0]);
      var form = helper.createFormWithOneField({
        modal: true,
        displayParent: outline
      });
      form.open();
      expect($('.glasspane').length).toBe(2);
      expect(desktop.navigation.$body.children('.glasspane').length).toBe(1);
      expect(outline.nodes[0].detailForm.$container.children('.glasspane').length).toBe(1);
      expect(desktop.header.$container.children('.glasspane').length).toBe(0);
      form.close();
      expect($('.glasspane').length).toBe(0);
    });

    it('blocks form if modal and displayParent is form', function() {
      var outline = outlineHelper.createOutlineWithOneDetailForm();
      var detailForm = outline.nodes[0].detailForm;
      desktop.setOutline(outline);
      outline.selectNodes(outline.nodes[0]);
      var form = helper.createFormWithOneField({
        modal: true,
        displayParent: detailForm
      });
      form.open();
      expect($('.glasspane').length).toBe(1);
      expect(desktop.navigation.$body.children('.glasspane').length).toBe(0);
      expect(detailForm.$container.children('.glasspane').length).toBe(1);
      expect(desktop.header.$container.children('.glasspane').length).toBe(0);
      form.close();
      expect($('.glasspane').length).toBe(0);
    });

  });

  describe('rootGroupBox.gridData', function() {
    it('is created using gridDataHints when the logical grid is validated', function() {
      var form = scout.create('Form', {
        parent: session.desktop,
        rootGroupBox: {
          objectType: 'GroupBox',
          gridDataHints: {
            heightInPixel: 100
          }
        }
      });
      form.render();
      expect(form.rootGroupBox.gridData.heightInPixel).toBe(0);

      // Logical grid will be validated along with the layout
      form.revalidateLayout();
      expect(form.rootGroupBox.gridData.heightInPixel).toBe(100);
    });
  });

  describe('initialFocus', function() {
    it('references the widget which should gain focus after the form is displayed', function() {
      var form = scout.create('Form', {
        parent: session.desktop,
        initialFocus: 'tabItem1',
        rootGroupBox: {
          objectType: 'GroupBox',
          fields: [{
            objectType: 'TabBox',
            id: 'tabBox',
            tabItems: [{
              objectType: 'TabItem',
              id: 'tabItem1'
            }, {
              objectType: 'TabItem',
              id: 'tabItem2'
            }]
          }]
        }
      });
      form.render();
      form.validateLayoutTree();
      expect(form.widget('tabItem1').isFocused());

      // InitialFocus property must not modify parent of tab items
      expect(form.widget('tabItem1').parent).toBe(form.widget('tabBox'));
      expect(form.widget('tabItem2').parent).toBe(form.widget('tabBox'));
    });
  });

});
