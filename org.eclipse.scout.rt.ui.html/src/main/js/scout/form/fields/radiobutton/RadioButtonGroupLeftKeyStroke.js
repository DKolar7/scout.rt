/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
scout.RadioButtonGroupLeftKeyStroke = function(radioButtonGroup) {
  scout.RadioButtonGroupLeftKeyStroke.parent.call(this);
  this.field = radioButtonGroup;
  this.which = [scout.keys.LEFT];
  this.renderingHints.render = false;
};
scout.inherits(scout.RadioButtonGroupLeftKeyStroke, scout.KeyStroke);

scout.RadioButtonGroupLeftKeyStroke.prototype.handle = function(event) {
  var fieldBefore,
    focusedButton = $(event.target).data('radiobutton');

  this.field.radioButtons.some(function(radioButton) {
    if (fieldBefore && radioButton === focusedButton) {
      fieldBefore.select();
      fieldBefore.focus();
      return true;
    }
    if (radioButton.enabledComputed && radioButton.visible) {
      fieldBefore = radioButton;
    }
  }, this);
};
