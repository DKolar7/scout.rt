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
scout.RadioButtonGroupAdapter = function() {
  scout.RadioButtonGroupAdapter.parent.call(this);
};
scout.inherits(scout.RadioButtonGroupAdapter, scout.ValueFieldAdapter);

/**
 * @override
 */
scout.RadioButtonGroupAdapter.prototype._initModel = function(model, parent) {
  model = scout.RadioButtonGroupAdapter.parent.prototype._initModel.call(this, model, parent);
  // Set logical grid to null -> Calculation happens on server side
  model.logicalGrid = null;
  return model;
};
