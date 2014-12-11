/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.json.form.fields.numberfield;

import org.eclipse.scout.rt.client.ui.form.fields.numberfield.INumberField;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.IJsonSession;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonValueField;

public class JsonNumberField<T extends INumberField> extends JsonValueField<T> {

  public JsonNumberField(T model, IJsonSession jsonSession, String id, IJsonAdapter<?> parent) {
    super(model, jsonSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "NumberField";
  }

  @Override
  protected void handleUiDisplayTextChangedImpl(String displayText, boolean whileTyping) {
    getModel().getUIFacade().setTextFromUI(displayText, whileTyping);
  }
}
