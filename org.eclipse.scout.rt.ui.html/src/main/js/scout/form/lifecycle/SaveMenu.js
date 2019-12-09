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
scout.SaveMenu = function() {
  scout.SaveMenu.parent.call(this);

  this.actionStyle = scout.Action.ActionStyle.BUTTON;
  this.keyStroke = 'enter';
  this.systemType = scout.Button.SystemType.SAVE;
};
scout.inherits(scout.SaveMenu, scout.Menu);

scout.SaveMenu.prototype._init = function(model) {
  scout.SaveMenu.parent.prototype._init.call(this, model);
  this.text = scout.nvl(this.text, this.session.text('SaveButton'));
};

scout.SaveMenu.prototype._doAction = function() {
  var form = this.getForm();
  var event = new scout.Event();
  this.trigger('action', event);
  if (!event.defaultPrevented) {
    form.save();
  }
};
