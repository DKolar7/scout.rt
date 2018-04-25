/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.json.desktop;

import org.eclipse.scout.rt.client.ui.desktop.notification.IDesktopNotification;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.notification.JsonNotification;

public class JsonDesktopNotification<DESKTOP_NOTIFICATION extends IDesktopNotification> extends JsonNotification<DESKTOP_NOTIFICATION> {

  public static final String EVENT_CLOSE = "close";

  public JsonDesktopNotification(DESKTOP_NOTIFICATION model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "DesktopNotification";
  }

  @Override
  protected void initJsonProperties(DESKTOP_NOTIFICATION model) {
    super.initJsonProperties(model);

    putJsonProperty(new JsonProperty<DESKTOP_NOTIFICATION>("duration", model) {
      @Override
      protected Long modelValue() {
        return getModel().getDuration();
      }
    });

    putJsonProperty(new JsonProperty<DESKTOP_NOTIFICATION>("closable", model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isClosable();
      }
    });
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    if (EVENT_CLOSE.equals(event.getType())) {
      handleUiClose();
    }
    else {
      super.handleUiEvent(event);
    }
  }

  protected void handleUiClose() {
    getModel().getUIFacade().fireClosedFromUI();
  }
}
