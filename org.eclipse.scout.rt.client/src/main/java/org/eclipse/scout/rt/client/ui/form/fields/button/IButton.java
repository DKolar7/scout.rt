/*******************************************************************************
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.form.fields.button;

import org.eclipse.scout.rt.client.ui.action.menu.root.IContextMenuOwner;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.platform.util.event.IFastListenerList;

/**
 * A Button has 2 aspects
 * <ol>
 * <li>System-button / NonSystem-button is marked by getSystemType()<br>
 * System buttons in a dialog have a pre-defined action handling
 * <li>Process-button / NonProcess-button is marked by isProcessButton()<br>
 * Process buttons are normally placed on dialogs button bar on the lower dialog bar
 * </ol>
 */
public interface IButton extends IFormField, IContextMenuOwner {
  /*
   * Properties
   */
  String PROP_ICON_ID = "iconId";
  String PROP_SELECTED = "selected";
  String PROP_CONTEXT_MENU = "contextMenu";
  String PROP_KEY_STROKE = "keyStroke";
  String PROP_KEY_STROKE_SCOPE_CLASS = "keyStrokeScopeClass";
  String PROP_KEY_STROKE_SCOPE = "keyStrokeScope";
  String PROP_PREVENT_DOUBLE_CLICK = "preventDoubleClick";
  String PROP_DEFAULT_BUTTON = "defaultButton";

  /*
   * System Types
   */
  int SYSTEM_TYPE_NONE = 0;
  int SYSTEM_TYPE_CANCEL = 1;
  int SYSTEM_TYPE_CLOSE = 2;
  int SYSTEM_TYPE_OK = 3;
  int SYSTEM_TYPE_RESET = 4;
  int SYSTEM_TYPE_SAVE = 5;
  int SYSTEM_TYPE_SAVE_WITHOUT_MARKER_CHANGE = 6;
  /*
   * Display Styles
   */
  int DISPLAY_STYLE_DEFAULT = 0;
  int DISPLAY_STYLE_TOGGLE = 1;
  int DISPLAY_STYLE_RADIO = 2;
  int DISPLAY_STYLE_LINK = 3;

  void doClick();

  int getSystemType();

  void setSystemType(int systemType);

  boolean isProcessButton();

  void setProcessButton(boolean on);

  Boolean getDefaultButton();

  void setDefaultButton(Boolean defaultButton);

  /**
   * Model Observer
   */
  IFastListenerList<ButtonListener> buttonListeners();

  default void addButtonListener(ButtonListener listener) {
    buttonListeners().add(listener);
  }

  default void removeButtonListener(ButtonListener listener) {
    buttonListeners().remove(listener);
  }

  String getIconId();

  void setIconId(String iconId);

  String getKeyStroke();

  void setKeyStroke(String keyStroke);

  /**
   * display style<br>
   * default, toggle, radio
   */
  int getDisplayStyle();

  /**
   * do not change this property when ui is attached<br>
   * major gui frameworks don't support runtime itemtype changes
   */
  void setDisplayStyleInternal(int i);

  /**
   * @return toggle and radio button state
   */
  boolean isSelected();

  /**
   * @param b
   *          toggle and radio button state
   */
  void setSelected(boolean b);

  boolean isPreventDoubleClick();

  void setPreventDoubleClick(boolean preventDoubleClick);

  /**
   * request showing the (dropdown) menu popup
   */
  void requestPopup();

  IButtonUIFacade getUIFacade();

  void setView(boolean visible, boolean enabled);

  Object getKeyStrokeScope();

  /**
   * Note: This method has no effect if the button is of system type {@link #SYSTEM_TYPE_CANCEL} or
   * {@link #SYSTEM_TYPE_CLOSE}. This allows the user to still close a form that is entirely disabled
   * ({@link IForm#setEnabledGranted(boolean)}).
   */
  @Override
  void setEnabledGranted(boolean enabled);
}
