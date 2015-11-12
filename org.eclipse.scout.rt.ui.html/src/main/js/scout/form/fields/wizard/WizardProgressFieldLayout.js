/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.WizardProgressFieldLayout = function(formField) {
  scout.WizardProgressFieldLayout.parent.call(this, formField);
};
scout.inherits(scout.WizardProgressFieldLayout, scout.FormFieldLayout);

scout.WizardProgressFieldLayout.prototype.layout = function($container) {
  scout.WizardProgressFieldLayout.parent.prototype.layout.call(this, $container);

  // Explicitly set width of body to scrollWidth because container is scrollable. Otherwise,
  // the body would have the wrong size because it has "overflow: hidden" set.
  this.formField.$wizardStepsBody.width(this.formField.$wizardStepsBody[0].scrollWidth);

  this.formField.scrollToActiveStep();
};
