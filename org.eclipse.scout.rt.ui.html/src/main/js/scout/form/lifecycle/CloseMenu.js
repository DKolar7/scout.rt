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
scout.CloseMenu = function() {
  scout.CloseMenu.parent.call(this);

  this.actionStyle = scout.Action.ActionStyle.BUTTON;
  this.keyStroke = 'esc';
  this.systemType = scout.Button.SystemType.CLOSE;
  this.inheritAccessibility = false;
  this.preventDoubleClick = true;
};
scout.inherits(scout.CloseMenu, scout.Menu);

scout.CloseMenu.prototype._init = function(model) {
  scout.CloseMenu.parent.prototype._init.call(this, model);
  this.text = scout.nvl(this.text, this.session.text('CloseButton'));
};

scout.CloseMenu.prototype._doAction = function() {
  var form = this.getForm();
  var event = new scout.Event();
  this.trigger('action', event);
  if (!event.defaultPrevented) {
    form.close();
  }
};
