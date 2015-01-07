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
package org.eclipse.scout.rt.client.ui.basic.table;

import java.util.LinkedList;
import java.util.List;

import org.eclipse.scout.commons.annotations.ConfigProperty;
import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.annotations.OrderedCollection;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.basic.table.columns.IColumn;
import org.eclipse.scout.rt.client.ui.basic.table.control.ITableControl;
import org.eclipse.scout.rt.client.ui.basic.table.menus.TableOrganizeMenu;
import org.eclipse.scout.rt.extension.client.ui.basic.table.AbstractExtensibleTable;
import org.eclipse.scout.rt.shared.services.common.exceptionhandler.IExceptionHandlerService;
import org.eclipse.scout.rt.shared.ui.UserAgentUtility;
import org.eclipse.scout.service.SERVICES;

public abstract class AbstractTable5 extends AbstractExtensibleTable implements ITable5 {
  private List<ITableControl> m_tableControls;
  private IReloadHandler m_reloadHandler;

  public AbstractTable5() {
    this(true);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    setTableStatusVisible(getConfiguredTableStatusVisible());
    setMenubarPosition(getConfiguredMenubarPosition());
  }

  public void setReloadHandler(IReloadHandler reloadHandler) {
    m_reloadHandler = reloadHandler;
  }

  // FIXME CGU: remove PropertyChangeListener in AbstractColumn constructor -> generates a lot of unnecessary events

  @Override
  protected void addHeaderMenusInternal(OrderedCollection<IMenu> menuList) {
    // FIXME CGU: how to distinguish between html ui and others? better create service?
    if (UserAgentUtility.isWebClient()) {
      menuList.addLast(new TableOrganizeMenu(this));
    }
    else {
      super.addHeaderMenusInternal(menuList);
    }
  }

  public AbstractTable5(boolean callInitializer) {
    super(false);

    m_tableControls = new LinkedList<ITableControl>();

    if (callInitializer) {
      callInitializer();
    }
  }

  @Override
  public List<ITableControl> getControls() {
    return m_tableControls;
  }

  @SuppressWarnings("unchecked")
  @Override
  public <T extends ITableControl> T getControl(Class<T> controlClass) {
    for (ITableControl control : getControls()) {
      if (controlClass.isAssignableFrom(control.getClass())) {
        return (T) control;
      }
    }
    return null;
  }

  @Override
  public void fireTableReloadFromUI() {
    try {
      if (m_reloadHandler != null) {
        m_reloadHandler.reload();
      }
    }
    catch (ProcessingException se) {
      SERVICES.getService(IExceptionHandlerService.class).handleException(se);
    }
  }

  @Override
  public void fireSortColumnRemovedFromUI(IColumn<?> column) {
    getColumnSet().removeSortColumn(column);
    sort();
  }

  @Override
  public Class<? extends IMenu> getDefaultMenu() {
    return super.getDefaultMenuInternal();
  }

  /**
   * Configures the visibility of the table status.
   * <p>
   * Subclasses can override this method. Default is {@code false}.
   *
   * @return {@code true} if the table status is visible, {@code false} otherwise.
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(200)
  protected boolean getConfiguredTableStatusVisible() {
    return false;
  }

  //FIXME CGU merge with ITableField table status. Probably move status from field to table to make it work without a field (outline mode)
  @Override
  public boolean isTableStatusVisible() {
    return propertySupport.getPropertyBool(PROP_TABLE_STATUS_VISIBLE);
  }

  @Override
  public void setTableStatusVisible(boolean b) {
    propertySupport.setPropertyBool(PROP_TABLE_STATUS_VISIBLE, b);
  }

  @Override
  public String getMenubarPosition() {
    return propertySupport.getPropertyString(PROP_MENU_BAR_POSITION);
  }

  @Override
  public void setMenubarPosition(String position) {
    propertySupport.setPropertyString(PROP_MENU_BAR_POSITION, position);
  }

  protected String getConfiguredMenubarPosition() {
    return null;
  }
}
