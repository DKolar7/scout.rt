scout.MessageBox = function() {
  scout.MessageBox.parent.call(this);
  this.$container;
  this.$content;
  this.$header;
  this.$body;
  this.$buttons;
  this.$yesButton;
  this.$noButton;
  this.$cancelButton;
  this._$closeButton;
  this.focusListener;
  this._addEventSupport();
  this.attached = false; // Indicates whether this message box is currently visible to the user.
};
scout.inherits(scout.MessageBox, scout.ModelAdapter);

// represents severity codes from IStatus
scout.MessageBox.SEVERITY = {
  OK: 1,
  INFO: 256,
  WARNING: 65536,
  ERROR: 16777216
};

/**
 * @override ModelAdapter
 */
scout.MessageBox.prototype._initKeyStrokeContext = function(keyStrokeContext) {
  scout.MessageBox.parent.prototype._initKeyStrokeContext.call(this, keyStrokeContext);

  keyStrokeContext.registerKeyStroke([
    new scout.FocusAdjacentElementKeyStroke(this.session, this),
    new scout.ClickActiveElementKeyStroke(this, [
      scout.keys.SPACE, scout.keys.ENTER
    ]),
    new scout.CloseKeyStroke(this, function() {
      return this._$closeButton;
    }.bind(this))
  ]);
};

scout.MessageBox.prototype._render = function($parent) {
  if (!$parent) {
    throw new Error('Missing argument $parent');
  }
  this._$parent = $parent;

  // Render modality glasspanes (must precede adding the message box to the DOM)
  this._glassPaneRenderer = new scout.GlassPaneRenderer(this.session, this, true);
  this._glassPaneRenderer.renderGlassPanes();

  this.$container = $parent.appendDiv('messagebox');

  var $handle = this.$container.appendDiv('drag-handle');
  this.$container.makeDraggable($handle);

  this.$content = this.$container.appendDiv('messagebox-content');
  this.$header = this.$content.appendDiv('messagebox-label messagebox-header');
  this.$body = this.$content.appendDiv('messagebox-label messagebox-body');
  this.$html = this.$content.appendDiv('messagebox-label messagebox-html');
  this.$buttons = this.$container.appendDiv('messagebox-buttons');

  var boxButtons = new scout.BoxButtons(this.$buttons, this._onButtonClick.bind(this));
  this._$closeButton = null; // button to be executed when close() is called, e.g. when ESCAPE is pressed
  if (this.yesButtonText) {
    this.$yesButton = boxButtons.addButton({
      text: this.yesButtonText,
      option: 'yes'
    });
    this._$closeButton = this.$yesButton;
  }
  if (this.noButtonText) {
    this.$noButton = boxButtons.addButton({
      text: this.noButtonText,
      option: 'no'
    });
    this._$closeButton = this.$noButton;
  }
  if (this.cancelButtonText) {
    this.$cancelButton = boxButtons.addButton({
      text: this.cancelButtonText,
      option: 'cancel'
    });
    this._$closeButton = this.$cancelButton;
  }

  // Render properties
  this._renderIconId(this.iconId);
  this._renderSeverity(this.severity);
  this._renderHeader(this.header);
  this._renderBody(this.body);
  this._renderHtml(this.html);
  this._renderHiddenText(this.hiddenText);

  // FIXME MOT: Somehow let the user copy the 'copyPasteText' - but how?

  // Prevent resizing when message-box is dragged off the viewport
  this.$container.addClass('calc-helper');
  var naturalWidth = this.$container.width();
  this.$container.removeClass('calc-helper');
  this.$container.css('min-width', Math.max(naturalWidth, boxButtons.buttonCount() * 100));
  boxButtons.updateButtonWidths(this.$container.width());
  // Now that all texts, paddings, widths etc. are set, we can calculate the position
  this._position();
  this.$container.addClassForAnimation('shown');

  this.attached = true;
};

scout.MessageBox.prototype._postRender = function() {
  this.session.focusManager.installFocusContext(this.$container, scout.focusRule.AUTO);
};

scout.MessageBox.prototype._remove = function() {
  this._glassPaneRenderer.removeGlassPanes();
  this.session.focusManager.uninstallFocusContext(this.$container);
  this.attached = false;

  scout.MessageBox.parent.prototype._remove.call(this);
};

scout.MessageBox.prototype._position = function() {
  this.$container.cssMarginLeft(-this.$container.outerWidth() / 2);
};

scout.MessageBox.prototype._renderIconId = function(iconId) {
  // FIXME BSH implement
};

scout.MessageBox.prototype._renderSeverity = function(severity) {
  this.$container.removeClass('severity-error');
  if (severity === scout.MessageBox.SEVERITY.ERROR) {
    this.$container.addClass('severity-error');
  }
};

scout.MessageBox.prototype._renderHeader = function(text) {
  this.$header.html(scout.strings.nl2br(text));
  this.$header.setVisible(text);
};

scout.MessageBox.prototype._renderBody = function(text) {
  this.$body.html(scout.strings.nl2br(text));
  this.$body.setVisible(text);
};

scout.MessageBox.prototype._renderHtml = function(text) {
  this.$html.html(text);
  this.$html.setVisible(text);
};

scout.MessageBox.prototype._renderHiddenText = function(text) {
  if (this.$hiddenText) {
    this.$hiddenText.remove();
  }
  if (text) {
    this.$hiddenText = $('<!-- \n' + text.replace(/<!--|-->/g, '') + '\n -->').appendTo(this.$content);
  }
};

scout.MessageBox.prototype._renderCopyPasteText = function(text) {
  // nop
};

scout.MessageBox.prototype._onButtonClick = function(event, option) {
  this._send('action', {option: option});
};

scout.MessageBox.prototype.onModelAction = function(event) {
  if (event.type === 'closed') {
    this._onMessageBoxClosed(event);
  } else {
    $.log.warn('Model event not handled. Widget: MessageBox. Event: ' + event.type + '.');
  }
};

scout.MessageBox.prototype._onMessageBoxClosed = function(event) {
  this.destroy();
};

/**
 * Used by CloseKeyStroke.js
 */
scout.MessageBox.prototype.close = function() {
  if (this._$closeButton && this.session.focusManager.requestFocus(this._$closeButton)) {
    this._$closeButton.click();
  }
};

/**
 * === Method required for objects attached to a 'displayParent' ===
 *
 * Method invoked once the 'displayParent' is attached;
 *
 *  In contrast to 'render/remove', this method uses 'JQuery attach/detach mechanism' to retain CSS properties, so that the model must not be interpreted anew.
 *  This method has no effect if already attached.
 */
scout.MessageBox.prototype.attach = function() {
  if (this.attached || !this.rendered) {
    return;
  }

  this._$parent.append(this.$container);
  this.session.detachHelper.afterAttach(this.$container);

  this.attached = true;
};

/**
 * === Method required for objects attached to a 'displayParent' ===
 *
 * Method invoked once the 'displayParent' is detached;
 *
 *  In contrast to 'render/remove', this method uses 'JQuery attach/detach mechanism' to retain CSS properties, so that the model must not be interpreted anew.
 *  This method has no effect if already detached.
 */
scout.MessageBox.prototype.detach = function() {
  if (!this.attached || !this.rendered) {
    return;
  }

  this.session.detachHelper.beforeDetach(this.$container);
  this.$container.detach();

  this.attached = false;
};
