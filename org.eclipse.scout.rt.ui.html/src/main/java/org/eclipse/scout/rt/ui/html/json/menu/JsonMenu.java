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
package org.eclipse.scout.rt.ui.html.json.menu;

import java.util.HashSet;
import java.util.Set;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.IMenuType;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.action.JsonAction;

public class JsonMenu<T extends IMenu> extends JsonAction<T> {

  public static final String EVENT_ABOUT_TO_SHOW = "aboutToShow";
  public static final String PROP_SEPARATOR = "separator";
  public static final String PROP_SYSTEM_TYPE = "systemType";

  public JsonMenu(T model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "Menu";
  }

  @Override
  protected void initJsonProperties(T model) {
    super.initJsonProperties(model);

    putJsonProperty(new JsonProperty<T>(PROP_SEPARATOR, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isSeparator();
      }
    });

    putJsonProperty(new JsonProperty<T>(IMenu.PROP_MENU_TYPES, model) {
      @Override
      protected Set<IMenuType> modelValue() {
        return getModel().getMenuTypes();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        Set<String> menuTypes = new HashSet<>();
        for (IMenuType type : getModel().getMenuTypes()) {
          String prefix = type.getClass().getSimpleName().replace("MenuType", "");
          menuTypes.add(prefix + "." + type.toString());
        }
        return menuTypes;
      }
    });
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    if (EVENT_ABOUT_TO_SHOW.equals(event.getType())) {
      handleUiMenuAboutToShow(event);
    }
    else {
      super.handleUiEvent(event);
    }
  }

  public void handleUiMenuAboutToShow(JsonEvent event) {
    getModel().aboutToShow();
  }
}
