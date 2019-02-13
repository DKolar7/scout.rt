/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.HtmlField = function() {
  scout.HtmlField.parent.call(this);
  this.scrollBarEnabled = false;
  this.preventInitialFocus = true;
};
scout.inherits(scout.HtmlField, scout.ValueField);

/**
 * @override FormField.js
 */
scout.HtmlField.prototype._initKeyStrokeContext = function() {
  scout.HtmlField.parent.prototype._initKeyStrokeContext.call(this);

  this.keyStrokeContext.registerKeyStroke(new scout.AppLinkKeyStroke(this, this._onAppLinkAction));
};

scout.HtmlField.prototype._render = function() {
  this.addContainer(this.$parent, 'html-field');
  this.addLabel();

  this.addField(this.$parent.makeDiv());
  this.addStatus();
};

scout.HtmlField.prototype._renderProperties = function() {
  scout.HtmlField.parent.prototype._renderProperties.call(this);

  this._renderScrollBarEnabled();
  this._renderScrollToAnchor();
};

scout.HtmlField.prototype._readDisplayText = function() {
  return this.$field.html();
};

/**
 * @override
 */
scout.HtmlField.prototype._renderDisplayText = function() {
  if (!this.displayText) {
    this.$field.empty();
    return;
  }
  this.$field.html(this.displayText);

  // Add action to app-links
  this.$field.find('.app-link')
    .on('click', this._onAppLinkAction.bind(this));

  // Don't change focus when a link is clicked by mouse
  this.$field.find('a, .app-link')
    .attr('tabindex', '0')
    .unfocusable();

  // Add listener to images to update the layout when the images are loaded
  this.$field.find('img')
    .on('load', this._onImageLoad.bind(this))
    .on('error', this._onImageError.bind(this));

  // Because this method replaces the content, the scroll bars might have to be added or removed
  if (this.rendered) { // (only necessary if already rendered, otherwise it is done by renderProperties)
    this._uninstallScrollbars();
    this._renderScrollBarEnabled();
  }

  this.invalidateLayoutTree();
};

scout.HtmlField.prototype.setScrollBarEnabled = function(scrollBarEnabled) {
  this.setProperty('scrollBarEnabled', scrollBarEnabled);
};

scout.HtmlField.prototype._renderScrollBarEnabled = function() {
  if (this.scrollBarEnabled) {
    this._installScrollbars();
  } else {
    this._uninstallScrollbars();
  }
};

/**
 * @deprecated use scrollToBottom instead
 */
scout.HtmlField.prototype.scrollToEnd = function() {
  this.scrollToBottom();
};

scout.HtmlField.prototype._renderScrollToAnchor = function() {
  if (!this.rendered) {
    this.session.layoutValidator.schedulePostValidateFunction(this._renderScrollToAnchor.bind(this));
    return;
  }
  var anchor = this.scrollToAnchor;
  if (this.scrollBarEnabled && anchor && this.$field.find(anchor)) {
    var anchorElem = this.$field.find('#'.concat(anchor));
    if (anchorElem && anchorElem.length > 0) {
      scout.scrollbars.scrollTo(this.$field, anchorElem);
    }
  }
};

scout.HtmlField.prototype._onAppLinkAction = function(event) {
  var $target = $(event.delegateTarget);
  var ref = $target.data('ref');
  this.triggerAppLinkAction(ref);
};

scout.HtmlField.prototype.triggerAppLinkAction = function(ref) {
  this.trigger('appLinkAction', {
    ref: ref
  });
};

scout.HtmlField.prototype._onImageLoad = function(event) {
  this.invalidateLayoutTree();
};

scout.HtmlField.prototype._onImageError = function(event) {
  this.invalidateLayoutTree();
};
