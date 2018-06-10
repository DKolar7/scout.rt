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
describe('ViewButtonBox', function() {
  var session, desktop, outlineHelper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
  });

  describe('viewMenuTab', function() {
    var viewButtonBox;

    beforeEach(function() {
      viewButtonBox = scout.create('ViewButtonBox', {
        parent: session.desktop,
        viewButtons: [scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        })]
      });
    });

    it('is only visible if there are at least 2 visible view buttons with displayStyle == "MENU"', function() {
      var viewButtons = [
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        }),
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button2',
          displayStyle: 'MENU',
          visible: true
        })
      ];
      viewButtonBox.setViewButtons(viewButtons);
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(true);
    });

    it('is not visible if there is only 1 visible view buttons with displayStyle == "MENU"', function() {
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
    });

    it('is not visible if there are no visible view buttons ith displayStyle == "MENU"', function() {
      viewButtonBox.viewButtons[0].visible = false;
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
    });

    it('is not visible if there are visible view buttons with displayStyle == "TAB"', function() {
      viewButtonBox.viewButtons[0].displayStyle = 'TAB';
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
    });

    it('is not visible if there are no view buttons at all', function() {
      viewButtonBox.viewButtons = [];
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
    });

  });

  describe('viewButtons', function() {
    var viewButtonBox;

    beforeEach(function() {
      viewButtonBox = scout.create('ViewButtonBox', {
        parent: session.desktop
      });
    });

    it('will be rendered as view tab when only one button with displayStyle == "MENU"', function() {
      var viewButtons = [
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        })
      ];
      viewButtonBox.setViewButtons(viewButtons);
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
      expect(viewButtonBox.tabButtons.length).toBe(1);
      expect(viewButtonBox.menuButtons.length).toBe(0);
    });

    /**
     * if only one button with display style "MENU" is visible this button is rendered as tabButton since a dropdown
     *  with only one menu dos not make sense.
     */
    it('will be rendered as menuButtons when two button with displayStyle == "MENU"', function() {
      var viewButtons = [
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        }),
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button2',
          displayStyle: 'MENU',
          visible: true
        })
      ];
      viewButtonBox.setViewButtons(viewButtons);
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(true);
      expect(viewButtonBox.tabButtons.length).toBe(0);
      expect(viewButtonBox.menuButtons.length).toBe(2);
    });

    it('will be rendered correctly when displayStyle changes dynamically.', function() {
      var viewButtons = [
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        }),
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button2',
          displayStyle: 'MENU',
          visible: true
        })
      ];
      viewButtonBox.setViewButtons(viewButtons);
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(true);
      expect(viewButtonBox.tabButtons.length).toBe(0);
      expect(viewButtonBox.menuButtons.length).toBe(2);

      viewButtons[0].setDisplayStyle('TAB');
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
      expect(viewButtonBox.tabButtons.length).toBe(2);
      expect(viewButtonBox.menuButtons.length).toBe(0);

    });

    it('will be rendered correctly when visibility changes dynamically.', function() {
      var viewButtons = [
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button1',
          displayStyle: 'MENU',
          visible: true
        }),
        scout.create('ViewButton', {
          parent: session.desktop,
          text: 'Button2',
          displayStyle: 'MENU',
          visible: true
        })
      ];
      viewButtonBox.setViewButtons(viewButtons);
      viewButtonBox.render();
      expect(viewButtonBox.viewMenuTab.visible).toBe(true);
      expect(viewButtonBox.tabButtons.length).toBe(0);
      expect(viewButtonBox.menuButtons.length).toBe(2);

      viewButtons[0].setVisible(false);
      expect(viewButtonBox.viewMenuTab.visible).toBe(false);
      expect(viewButtonBox.tabButtons.length).toBe(1);
      expect(viewButtonBox.menuButtons.length).toBe(0);
    });
  });

});
