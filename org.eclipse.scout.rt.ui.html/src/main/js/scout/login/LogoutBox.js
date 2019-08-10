/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
scout.LogoutBox = function() {
  scout.LogoutBox.parent.call(this);
};
scout.inherits(scout.LogoutBox, scout.Box);

scout.LogoutBox.prototype.init = function(opts) {
  var defaultOpts = {
    loginUrl: scout.webstorage.getItem(sessionStorage, 'scout:loginUrl') || './',
    logoUrl: 'res/logo.png'
  };
  this.options = $.extend({}, defaultOpts, opts);
  var defaultTexts = {
    'ui.LogoutSuccessful': 'Good bye!',
    'ui.LoginAgain': 'Login again'
  };
  this.options.texts = $.extend({}, defaultTexts, opts.texts);

  this.texts = new scout.TextMap(this.options.texts);
  this.loginUrl = this.options.loginUrl;
  this.logoUrl = this.options.logoUrl;
};

scout.LogoutBox.prototype._render = function() {
  scout.LogoutBox.parent.prototype._render.call(this);

  this.$content.addClass('small centered')
    .appendDiv().html(scout.strings.nl2br(this.texts.get('ui.LogoutSuccessful')));

  this.$buttonBar = $('<div>')
    .addClass('button-bar')
    .appendTo(this.$content);
  $('<button>')
    .addClass('button')
    .text(this.texts.get('ui.LoginAgain'))
    .on('click', this._loginAgain.bind(this))
    .appendTo(this.$buttonBar);
};

scout.LogoutBox.prototype._loginAgain = function() {
  window.location = this.loginUrl;
};
