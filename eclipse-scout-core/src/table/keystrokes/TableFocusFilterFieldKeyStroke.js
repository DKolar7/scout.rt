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
import {Key, keys, KeyStroke, scout} from '../../index';
import $ from 'jquery';

/**
 * Keystroke to move the cursor into field field to table footer.
 *
 * Hint: This keystroke is not implemented as RangeKeyStroke.js because:
 *       a) the accepted keys are not rendered on F1, but a condensed 'a-z' instead;
 *       b) there is no need to evaluate a concrete key's propagation status when being rendered (because of (a))
 *
 */
export default class TableFocusFilterFieldKeyStroke extends KeyStroke {

  constructor(table) {
    super();
    this.field = table;

    this.renderingHints.$drawingArea = ($drawingArea, event) => event._$filterInput;

    this.virtualKeyStrokeWhich = 'a-Z;a-z;0-9';
    this.preventDefault = false; // false so that the key is inserted into the search field.
    this.keyStrokeMode = KeyStroke.Mode.DOWN;
  }

  /**
   * @override KeyStroke.js
   */
  _accept(event) {
    if (!this._isKeyStrokeInRange(event)) {
      return false;
    }

    let $filterInput = $('.table-text-filter', this.field.$container);
    if (!$filterInput.length) {
      return false;
    }

    let $activeElement = this.field.$container.activeElement();
    let activeElementType = $activeElement[0].tagName.toLowerCase();
    let focusOnInputField = (activeElementType === 'textarea' || activeElementType === 'input');
    if (!$activeElement.hasClass('table-text-filter') || !focusOnInputField) {
      event._$filterInput = $filterInput;
      this._isKeyStrokeInRange(event);
      return true;
    }
    return false;
  }

  /**
   * @override KeyStroke.js
   */
  handle(event) {
    let $filterInput = event._$filterInput;

    // Focus the field and move cursor to the end.
    if (this.field.session.focusManager.requestFocus($filterInput)) {
      $filterInput.focus();

      let length = scout.nvl($filterInput.val(), '').length;
      $filterInput[0].setSelectionRange(length, length);
    }
  }

  /**
   * Returns a virtual key to represent this keystroke.
   */
  keys() {
    return [new Key(this, this.virtualKeyStrokeWhich)];
  }

  /**
   * @override KeyStroke.js
   */
  renderKeyBox($drawingArea, event) {
    let $filterInput = event._$filterInput;
    let filterInputPosition = $filterInput.position();
    let left = filterInputPosition.left + $filterInput.cssMarginLeft() + 4;
    $filterInput.beforeDiv('key-box char', 'a - z')
      .toggleClass('disabled', !this.enabledByFilter)
      .cssLeft(left);
    return $filterInput.parent();
  }

  _isKeyStrokeInRange(event) {
    if (event.which === this.virtualKeyStrokeWhich) {
      return true; // the event has this keystroke's 'virtual which part' in case it is rendered.
    }

    if (event.altKey | event.ctrlKey) { // NOSONAR
      return false;
    }
    return (event.which >= keys.a && event.which <= keys.z) ||
      (event.which >= keys.A && event.which <= keys.Z) ||
      (event.which >= keys['0'] && event.which <= keys['9']) ||
      (event.which >= keys.NUMPAD_0 && event.which <= keys.NUMPAD_9);
  }
}
