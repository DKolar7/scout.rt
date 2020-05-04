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
import {MenuSpecHelper} from '@eclipse-scout/testing';

describe('MenuBarPopup', () => {

  let helper, session, $sandbox, modelMenu1, modelMenu2, menu1, menu2;

  beforeEach(() => {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new MenuSpecHelper(session);
  });

  afterEach(() => {
    removePopups(session);
  });

  it('is opened on doAction if the menu has child actions', () => {
    let childMenu = helper.createMenu({text: 'child menu'});
    let menu = helper.createMenu({
      text: 'the menu',
      childActions: [childMenu]
    });
    menu.render();
    menu.doAction();
    expect(menu.popup).toBeDefined();
    expect(menu.popup.rendered).toBe(true);
  });

  it('rerenders the head on a menu property change', () => {
    let childMenu = helper.createMenu({text: 'child menu'});
    let menu = helper.createMenu({
      text: 'the menu',
      childActions: [childMenu]
    });
    menu.render();
    menu.doAction();
    expect(menu.popup.$head.children('.text').text()).toEqual('the menu');

    menu.setText('new text');
    session.layoutValidator.validate();
    expect(menu.popup.$head.children('.text').text()).toEqual('new text');
  });
});
