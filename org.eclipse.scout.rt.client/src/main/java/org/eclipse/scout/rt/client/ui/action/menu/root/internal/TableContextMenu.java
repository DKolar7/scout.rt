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
package org.eclipse.scout.rt.client.ui.action.menu.root.internal;

import java.beans.PropertyChangeEvent;
import java.util.Collection;
import java.util.List;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.MenuUtility;
import org.eclipse.scout.rt.client.ui.action.menu.root.AbstractContextMenu;
import org.eclipse.scout.rt.client.ui.action.menu.root.ITableContextMenu;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.table.ITableRow;
import org.eclipse.scout.rt.client.ui.basic.table.TableEvent;
import org.eclipse.scout.rt.platform.classid.ClassId;
import org.eclipse.scout.rt.platform.util.CollectionUtility;

/**
 * The invisible root menu node of any table. (internal usage only)
 */
@ClassId("97f17065-0142-4362-9dd4-a34148e20bb3")
public class TableContextMenu extends AbstractContextMenu<ITable> implements ITableContextMenu {
  private List<? extends ITableRow> m_currentSelection;

  /**
   * @param owner
   */
  public TableContextMenu(ITable owner, List<? extends IMenu> initialChildMenus) {
    super(owner, initialChildMenus);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    getContainer().addTableListener(
        e -> {
          switch (e.getType()) {
            case TableEvent.TYPE_ROWS_SELECTED:
              handleOwnerValueChanged();
              break;
            case TableEvent.TYPE_ROWS_UPDATED:
              if (CollectionUtility.containsAny(e.getRows(), m_currentSelection)) {
                handleOwnerValueChanged();
              }
              break;
          }
        },
        TableEvent.TYPE_ROWS_SELECTED,
        TableEvent.TYPE_ROWS_UPDATED);
    // set active filter
    setCurrentMenuTypes(MenuUtility.getMenuTypesForTableSelection(getContainer().getSelectedRows()));
    calculateLocalVisibility();
  }

  @Override
  protected void afterChildMenusAdd(Collection<? extends IMenu> newChildMenus) {
    super.afterChildMenusAdd(newChildMenus);
    handleOwnerEnabledChanged();
  }

  @Override
  protected void afterChildMenusRemove(Collection<? extends IMenu> childMenusToRemove) {
    super.afterChildMenusRemove(childMenusToRemove);
    handleOwnerEnabledChanged();
  }

  protected void handleOwnerEnabledChanged() {
    ITable container = getContainer();
    if (container != null) {
      final boolean enabled = container.isEnabled();
      visit(menu -> {
        if (!menu.hasChildActions() && menu.isInheritAccessibility()) {
          menu.setEnabled(enabled);
        }
      }, IMenu.class);
    }
  }

  @Override
  public void callOwnerValueChanged() {
    handleOwnerValueChanged();
  }

  protected void handleOwnerValueChanged() {
    m_currentSelection = null;
    if (getContainer() != null) {
      final List<ITableRow> ownerValue = getContainer().getSelectedRows();
      m_currentSelection = CollectionUtility.arrayList(ownerValue);
      setCurrentMenuTypes(MenuUtility.getMenuTypesForTableSelection(ownerValue));
      visit(new MenuOwnerChangedVisitor(ownerValue, getCurrentMenuTypes()), IMenu.class);
      calculateLocalVisibility();
      calculateEnableState(ownerValue);
    }
  }

  /**
   * @param ownerValue
   */
  protected void calculateEnableState(List<? extends ITableRow> ownerValue) {
    boolean enabled = getContainer().isEnabled();
    if (enabled) {
      for (ITableRow row : ownerValue) {
        if (!row.isEnabled()) {
          enabled = false;
          break;
        }
      }
    }
    final boolean inheritedEnability = enabled;
    visit(menu -> {
      if (!menu.hasChildActions() && menu.isInheritAccessibility()) {
        menu.setEnabledInheritAccessibility(inheritedEnability);
      }
    }, IMenu.class);
  }

  @Override
  protected void handleOwnerPropertyChanged(PropertyChangeEvent evt) {
    if (ITable.PROP_ENABLED.equals(evt.getPropertyName())) {
      handleOwnerEnabledChanged();
    }
  }
}
