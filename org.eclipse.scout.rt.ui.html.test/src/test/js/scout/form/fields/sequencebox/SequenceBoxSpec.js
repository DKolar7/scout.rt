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
describe('SequenceBox', function() {
  var session, helper, menuHelper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new scout.FormSpecHelper(session);
    menuHelper = new scout.MenuSpecHelper(session);
  });

  function createField(modelProperties) {
    var seqBox = helper.createField('SequenceBox', session.desktop, modelProperties);
    var fields = [
      helper.createField('StringField', seqBox, {statusVisible: false}),
      helper.createField('DateField', seqBox, {statusVisible: false})
    ];
    seqBox.setProperty('fields', fields);
    return seqBox;
  }

  describe('mandatory indicator', function() {

    // Must not contain an indicator to prevent a double indicator if the first field is mandatory too
    it('does not exist', function() {
      var field = createField({mandatory: true});
      field.render();

      expect(field.$mandatory).toBeUndefined();
    });

  });

  describe('label width', function() {

    it('is 0 if it is empty', function() {
      var field = createField();
      field.render();
      // css is not applied, therefore we need to adjust display style here
      field.fields[0].$label.css('display', 'inline-block');
      field.validateLayout();

      expect(field.fields[0].$label.outerWidth(true)).toBe(0);
    });

  });

  describe('status handling', function() {

    it('moves the error status of the last field to the seq box', function() {
      var field = createField({statusVisible: false});
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.errorStatus).toBeFalsy();
      expect(field.fields[1].$status.isVisible()).toBe(false);
      expect(field.fields[1].errorStatus).toBeFalsy();

      field.fields[1].setErrorStatus({message:'foo'});

      expect(field.$status.isVisible()).toBe(true);
      expect(field.errorStatus.message).toBe('foo');
      expect(field.fields[1].$status.isVisible()).toBe(false);
      expect(field.fields[1].errorStatus.message).toBe('foo');
    });

    it('moves the tooltip of the last field to the seq box', function() {
      var field = createField({statusVisible: false});
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.tooltipText).toBeFalsy();
      expect(field.fields[1].$status.isVisible()).toBe(false);
      expect(field.fields[1].tooltipText).toBeFalsy();

      field.fields[1].setProperty('tooltipText', 'foo');

      expect(field.$status.isVisible()).toBe(true);
      expect(field.tooltipText).toBe('foo');
      expect(field.fields[1].$status.isVisible()).toBe(false);
      expect(field.fields[1].tooltipText).toBe('foo');
    });

    it('moves the menus of the last field to the seq box', function() {
      var field = createField({statusVisible: false});
      var menu0 = menuHelper.createMenu(menuHelper.createModel());
      field.fields[1].menus = [menu0];
      field.fields[1].menusVisible = false;
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.menus.length).toBe(1);
      expect(field.$container).not.toHaveClass('has-menus');
      expect(field.fields[1].$status.isVisible()).toBe(false);

      field.fields[1].setProperty('menusVisible', true);

      expect(field.$status.isVisible()).toBe(true);
      expect(field.menus.length).toBe(1);
      expect(field.$container).toHaveClass('has-menus');
      expect(field.fields[1].$status.isVisible()).toBe(false);
    });

    it('does not display the error message of the last field, only the one of the seq box', function() {
      var field = createField({statusVisible: false});
      field.render();

      expect(field.fields[1].tooltip).toBeFalsy();
      expect(field.tooltip).toBeFalsy();

      field.fields[1].setProperty('errorStatus', {message:'foo'});

      expect(field.fields[1].tooltip).toBeFalsy();
      expect(field.tooltip.rendered).toBe(true);
    });

    it('removes the tooltip from the seq box if last field gets invisible', function() {
      var field = createField({statusVisible: false});
      field.fields[1].tooltipText = 'foo';
      field.render();

      expect(field.$status.isVisible()).toBe(true);
      expect(field.tooltipText).toBe('foo');
      expect(field.fields[1].$status.isVisible()).toBe(false);
      expect(field.fields[1].tooltipText).toBe('foo');

      field.fields[1].setProperty('visible', false);

      expect(field.$status.isVisible()).toBe(false);
      expect(field.tooltipText).toBeFalsy();
      expect(field.fields[1].$container.isVisible()).toBe(false);
      expect(field.fields[1].tooltipText).toBe('foo');
    });

    it('moves the tooltip from the first field to the seq box if it gets the last field after a visibility change', function() {
      var field = createField({statusVisible: false});
      field.fields[0].tooltipText = 'foo';
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.tooltipText).toBeFalsy();
      expect(field.fields[0].$status.isVisible()).toBe(true);
      expect(field.fields[0].tooltipText).toBe('foo');

      field.fields[1].setProperty('visible', false);

      expect(field.$status.isVisible()).toBe(true);
      expect(field.tooltipText).toBe('foo');
      expect(field.fields[0].$status.isVisible()).toBe(false);
      expect(field.fields[0].tooltipText).toBe('foo');
    });

    it('moves the error from the first field to the seq box if it gets the last field after a visibility change', function() {
      var field = createField({statusVisible: false});
      field.fields[0].errorStatus = new scout.Status({message: 'foo'});
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.errorStatus).toBeFalsy();
      expect(field.tooltip).toBeFalsy();
      expect(field.fields[0].$status.isVisible()).toBe(true);
      expect(field.fields[0].tooltip.rendered).toBe(true);
      expect(field.fields[0].errorStatus.message).toBe('foo');

      field.fields[1].setProperty('visible', false);

      expect(field.$status.isVisible()).toBe(true);
      expect(field.errorStatus.message).toBe('foo');
      expect(field.fields[0].$status.isVisible()).toBe(false);
      expect(field.fields[0].tooltip).toBe(null);
      expect(field.fields[0].errorStatus.message).toBe('foo');
    });

    it('makes sure the status may be displayed on the field again if the field was the last visible field once', function() {
      var field = createField({statusVisible: false});
      field.fields[0].errorStatus = new scout.Status({message: 'foo'});
      field.render();

      expect(field.$status.isVisible()).toBe(false);
      expect(field.errorStatus).toBeFalsy();
      expect(field.tooltip).toBeFalsy();
      expect(field.fields[0].$status.isVisible()).toBe(true);
      expect(field.fields[0].tooltip.rendered).toBe(true);
      expect(field.fields[0].errorStatus.message).toBe('foo');

      field.fields[1].setProperty('visible', false);

      expect(field.$status.isVisible()).toBe(true);
      expect(field.errorStatus.message).toBe('foo');
      expect(field.fields[0].$status.isVisible()).toBe(false);
      expect(field.fields[0].tooltip).toBe(null);
      expect(field.fields[0].errorStatus.message).toBe('foo');

      field.fields[1].setProperty('visible', true);

      expect(field.$status.isVisible()).toBe(false);
      expect(field.errorStatus).toBeFalsy();
      expect(field.tooltip).toBeFalsy();
      expect(field.fields[0].$status.isVisible()).toBe(true);
      expect(field.fields[0].tooltip.rendered).toBe(true);
      expect(field.fields[0].errorStatus.message).toBe('foo');
    });

  });

  describe('label', function() {

    it('is linked with the fields (also considers fields own label)', function() {
      var field = createField();
      field.setLabel('box label');
      field.fields[0].setLabel('first label');
      field.fields[1].setLabel('second label');
      field.fields[1].setHasTime(true);
      field.render();
      expect(field.fields[0].$field.attr('aria-labelledby')).toBeTruthy();
      expect(field.fields[0].$field.attr('aria-labelledby')).toBe(field.$label.attr('id') + ' ' + field.fields[0].$label.attr('id'));
      expect(field.fields[1].$dateField.attr('aria-labelledby')).toBeTruthy();
      expect(field.fields[1].$dateField.attr('aria-labelledby')).toBe(field.$label.attr('id') + ' ' + field.fields[1].$label.attr('id'));
      expect(field.fields[1].$timeField.attr('aria-labelledby')).toBeTruthy();
      expect(field.fields[1].$timeField.attr('aria-labelledby')).toBe(field.$label.attr('id') + ' ' + field.fields[1].$label.attr('id'));
    });

    it('focuses the first visible field when clicked', function() {
      var field = createField();
      field.render();
      field.setLabel('box label');
      field.$label.triggerClick();
      expect(field.fields[0].$field).toBeFocused();

      field.fields[0].setVisible(false);
      field.$label.triggerClick();
      expect(field.fields[1].$dateField).toBeFocused();
    });

  });

  describe("clone", function() {
    it("considers the clone properties and deep clones fields", function() {
      var cloneHelper = new scout.CloneSpecHelper();
      var seqBox = scout.create('SequenceBox', {
        parent: session.desktop,
        id: 'seq01',
        label: 'abc',
        fields: [{
          objectType: 'StringField',
          labelVisible: false
        }, {
          objectType: 'DateField',
          label: 'a date field'
        }],
        menus: [{
          objectType: 'Menu'
        }]
      });
      var clone = seqBox.clone({
        parent: seqBox.parent
      });

      cloneHelper.validateClone(seqBox, clone);
      expect(clone.fields.length).toBe(2);
      expect(clone.cloneOf).toBe(seqBox);
      expect(clone.label).toBe('abc');
      expect(clone.fields[0].cloneOf).toBe(seqBox.fields[0]);
      expect(clone.fields[0].labelVisible).toBe(false);
      expect(clone.fields[1].cloneOf).toBe(seqBox.fields[1]);
      expect(clone.fields[1].label).toBe('a date field');

      // Assert that logical grid is a new instance
      expect(clone.logicalGrid).not.toBe(seqBox.logicalGrid);
      expect(clone.logicalGrid.gridConfig instanceof scout.SequenceBoxGridConfig).toBe(true);
    });
  });

});
