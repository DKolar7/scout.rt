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
import java.util.Set;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.MenuUtility;
import org.eclipse.scout.rt.client.ui.action.menu.root.AbstractContextMenu;
import org.eclipse.scout.rt.client.ui.action.menu.root.ITreeContextMenu;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.tree.ITree;
import org.eclipse.scout.rt.client.ui.basic.tree.ITreeNode;
import org.eclipse.scout.rt.client.ui.basic.tree.TreeEvent;
import org.eclipse.scout.rt.platform.classid.ClassId;
import org.eclipse.scout.rt.platform.util.CollectionUtility;

@ClassId("8af6de2d-6e4a-4008-821f-1830b6a360fd")
public class TreeContextMenu extends AbstractContextMenu<ITree> implements ITreeContextMenu {
  private Set<? extends ITreeNode> m_currentSelection;

  /**
   * @param owner
   */
  public TreeContextMenu(ITree owner, List<? extends IMenu> initialChildMenus) {
    super(owner, initialChildMenus);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    getContainer().addTreeListener(
        e -> {
          switch (e.getType()) {
            case TreeEvent.TYPE_NODES_SELECTED: {
              handleOwnerValueChanged();
              break;
            }
            case TreeEvent.TYPE_NODES_UPDATED: {
              if (CollectionUtility.containsAny(e.getNodes(), m_currentSelection)) {
                handleOwnerValueChanged();
              }
              break;
            }
          }
        },
        TreeEvent.TYPE_NODES_SELECTED,
        TreeEvent.TYPE_NODES_UPDATED);
    // init current menu types
    setCurrentMenuTypes(MenuUtility.getMenuTypesForTreeSelection(getContainer().getSelectedNodes()));
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
    ITree container = getContainer();
    if (container != null) {
      final boolean enabled = container.isEnabled();
      visit(menu -> {
        if (!menu.hasChildActions() && menu.isInheritAccessibility()) {
          menu.setEnabledInheritAccessibility(enabled);
        }
      }, IMenu.class);
    }
  }

  @Override
  public void callOwnerValueChanged() {
    handleOwnerValueChanged();
  }

  protected void handleOwnerValueChanged() {
    if (getContainer() != null) {
      final Set<ITreeNode> ownerSelection = getContainer().getSelectedNodes();
      m_currentSelection = CollectionUtility.hashSet(ownerSelection);
      setCurrentMenuTypes(MenuUtility.getMenuTypesForTreeSelection(ownerSelection));
      visit(new MenuOwnerChangedVisitor(ownerSelection, getCurrentMenuTypes()), IMenu.class);
      // update menu types
      calculateLocalVisibility();
      calculateEnableState(ownerSelection);
    }
  }

  /**
   * @param ownerSelection
   */
  protected void calculateEnableState(Collection<? extends ITreeNode> ownerSelection) {
    boolean enabled = true;
    for (ITreeNode node : ownerSelection) {
      if (!node.isEnabled()) {
        enabled = false;
        break;
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
