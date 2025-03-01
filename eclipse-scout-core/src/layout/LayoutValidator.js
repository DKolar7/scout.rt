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
import {arrays} from '../index';

export default class LayoutValidator {

  constructor() {
    this._invalidComponents = [];
    this._validateTimeoutId = null;
    this._postValidateFunctions = [];
  }

  invalidateTree(htmlComp) {
    let validateRoot,
      htmlParent = htmlComp,
      htmlSource = htmlComp;

    // Mark every parent as invalid until validate root
    while (htmlParent) {
      htmlComp = htmlParent;
      htmlComp.invalidateLayout(htmlSource);
      if (htmlComp.isValidateRoot()) {
        validateRoot = htmlComp;
        break;
      }
      htmlParent = htmlComp.getParent();
    }

    if (!htmlParent) {
      validateRoot = htmlComp;
    }

    this.invalidate(validateRoot);
  }

  invalidate(htmlComp) {
    let position = 0;
    // Don't insert if already inserted...
    // Info: when component is already in list but no one triggers validation,
    // validation is never scheduled that's why we call scheduleValidation here.
    if (this._invalidComponents.indexOf(htmlComp) >= 0) {
      this._scheduleValidation(); // ... but schedule validation
      return;
    }

    // Make sure it will be inserted before any descendant
    // This prevents multiple layouting of the descendant
    this._invalidComponents.forEach((invalidComponent, i) => {
      if (invalidComponent.isDescendantOf(htmlComp)) {
        return;
      }
      position++;
    }, this);

    // Add validate root to list of invalid components. These are the starting point for a subsequent call to validate().
    arrays.insert(this._invalidComponents, htmlComp, position);

    this._scheduleValidation();
  }

  _scheduleValidation() {
    if (this._validateTimeoutId === null) {
      this._validateTimeoutId = setTimeout(() => {
        this.validate();
      });
    }
  }

  /**
   * Layouts all invalid components (as long as they haven't been removed).
   */
  validate() {
    clearTimeout(this._validateTimeoutId);
    this._validateTimeoutId = null;
    this._invalidComponents.slice().forEach(function(comp) {
      if (comp.validateLayout()) {
        arrays.remove(this._invalidComponents, comp);
      }
    }, this);
    this._postValidateFunctions.slice().forEach(function(func) {
      func();
      arrays.remove(this._postValidateFunctions, func);
    }, this);
  }

  /**
   * Removes those components from this._invalidComponents which have the given container as ancestor.
   * The idea is to remove all components whose ancestor is about to be removed from the DOM.
   */
  cleanupInvalidComponents($parentContainer) {
    this._invalidComponents.slice().forEach(function(comp) {
      if (comp.$comp.closest($parentContainer).length > 0) {
        arrays.remove(this._invalidComponents, comp);
      }
    }, this);
  }

  /**
   * Runs the given function at the end of validate().
   */
  schedulePostValidateFunction(func) {
    if (func) {
      this._postValidateFunctions.push(func);
    }
  }
}
