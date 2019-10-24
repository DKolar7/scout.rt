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
import {Device} from '../index';
import {HtmlComponent} from '../index';
import {Widget} from '../index';
import {scout} from '../index';

export default class IFrame extends Widget {

constructor() {
  super();

  this.location = null;
  this.sandboxEnabled = true;
  this.sandboxPermissions = null;
  this.scrollBarEnabled = true;
  this.trackLocation = false;
  // Iframe on iOS is always as big as its content. Workaround it by using a wrapper div with overflow: auto
  // Don't wrap it when running in the chrome emulator (in that case isIosPlatform returns false)
  this.wrapIframe = Device.get().isIosPlatform();
  this.$iframe = null;
  this._loadHandler = this._onLoad.bind(this);
}


_render() {
  if (this.wrapIframe) {
    this.$container = this.$parent.appendDiv('iframe-wrapper');
    this.$iframe = this.$container.appendElement('<iframe>', 'iframe');
  } else {
    this.$iframe = this.$parent.appendElement('<iframe>', 'iframe');
    this.$container = this.$iframe;
  }
  this.htmlComp = HtmlComponent.install(this.$container, this.session);
}

/**
 * @override ValueField.js
 */
_renderProperties() {
  super._renderProperties();
  this._renderScrollBarEnabled(); // Needs to be before _renderLocation, see comment in _renderScrollBarEnabled
  this._renderLocation();
  this._renderSandboxEnabled(); // includes _renderSandboxPermissions()
  this._renderTrackLocationChange();
}

setLocation(location) {
  this.setProperty('location', location);
}

_renderLocation() {
  // Convert empty locations to 'about:blank', because in Firefox (maybe others, too?),
  // empty locations simply remove the src attribute but don't remove the old content.
  var location = this.location || 'about:blank';
  this.$iframe.attr('src', location);
}

setTrackLocationChange(trackLocation) {
  this.setProperty('trackLocation', trackLocation);
}

_renderTrackLocationChange(trackLocation) {
  if (this.trackLocation) {
    this.$iframe.on('load', this._loadHandler);
  } else {
    this.$iframe.off('load', this._loadHandler);
  }
}

_onLoad(event) {
  if (!this.rendered) { // check needed, because this is an async callback
    return;
  }

  if (this.trackLocation) {
    var doc = this.$iframe[0].contentDocument;
    if (!doc) {
      // Doc can be null if website cannot be loaded or if website is not from same origin
      return;
    }
    var location = doc.location.href;
    if (location === 'about:blank') {
      location = null;
    }
    this._setProperty('location', location);
  }
}

setScrollBarEnabled(scrollBarEnabled) {
  this.setProperty('scrollBarEnabled', scrollBarEnabled);
}

_renderScrollBarEnabled() {
  this.$container.toggleClass('no-scrolling', !this.scrollBarEnabled);
  // According to http://stackoverflow.com/a/18470016, setting 'overflow: hidden' via
  // CSS should be enough. However, if the inner page sets 'overflow' to another value,
  // scroll bars are shown again. Therefore, we add the legacy 'scrolling' attribute,
  // which is deprecated in HTML5, but seems to do the trick.
  this.$iframe.attr('scrolling', (this.scrollBarEnabled ? 'yes' : 'no'));

  // re-render location otherwise the attribute change would have no effect, see
  // https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-sandbox
  if (this.rendered) {
    this._renderLocation();
  }
}

setSandboxEnabled(sandboxEnabled) {
  this.setProperty('sandboxEnabled', sandboxEnabled);
}

_renderSandboxEnabled() {
  if (this.sandboxEnabled) {
    this._renderSandboxPermissions();
  } else {
    this.$iframe.removeAttr('sandbox');
    this.$iframe.removeAttr('security');
  }
  // re-render location otherwise the attribute change would have no effect, see
  // https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-sandbox
  this._renderLocation();
}

setSandboxPermissions(sandboxPermissions) {
  this.setProperty('sandboxPermissions', sandboxPermissions);
}

_renderSandboxPermissions() {
  if (!this.sandboxEnabled) {
    return;
  }
  this.$iframe.attr('sandbox', scout.nvl(this.sandboxPermissions, ''));
  if (Device.get().requiresIframeSecurityAttribute()) {
    this.$iframe.attr('security', 'restricted');
  }
  // re-render location otherwise the attribute change would have no effect, see
  // https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-sandbox
  this._renderLocation();
}
}
