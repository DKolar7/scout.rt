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
package org.eclipse.scout.rt.client.ui.action;

import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;
import java.util.Set;
import java.util.function.Predicate;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.IMenuType;
import org.eclipse.scout.rt.client.ui.action.tree.IActionNode;
import org.eclipse.scout.rt.platform.util.CollectionUtility;

public final class ActionUtility {

  private ActionUtility() {
  }

  public static final Predicate<IAction> FALSE_FILTER = action -> false;

  public static final Predicate<IAction> TRUE_FILTER = action -> true;

  /**
   * Removes invisible actions. Also removes leading and trailing separators as well as multiple consecutive separators.
   *
   * @since 3.8.1
   */
  public static <T extends IAction> List<T> visibleNormalizedActions(List<T> actionNodes) {
    return normalizedActions(actionNodes, createVisibleFilter());
  }

  public static <T extends IAction> List<T> normalizedActions(List<T> actionNodes, Predicate<IAction> filter) {
    if (actionNodes == null) {
      return CollectionUtility.emptyArrayList();
    }

    // only visible
    List<T> cleanedActions = getActions(actionNodes, filter);

    normalizeSeparators(cleanedActions);
    return cleanedActions;
  }

  public static <T extends IAction> void normalizeSeparators(List<T> actions) {
    // remove multiple and leading separators
    T prevAction = null;
    ListIterator<T> it = actions.listIterator();
    while (it.hasNext()) {
      T currentAction = it.next();
      if (currentAction.isSeparator() && (prevAction == null || prevAction.isSeparator())) {
        it.remove();
        continue;
      }
      prevAction = currentAction;
    }
    // remove trailing separators
    while (it.hasPrevious()) {
      T previous = it.previous();
      if (previous.isSeparator()) {
        it.remove();
      }
      else {
        break;
      }
    }
  }

  public static <T extends IAction> List<T> getActions(List<T> actions, final Predicate<IAction> filter) {
    if (actions != null) {
      List<T> result = new ArrayList<>(actions.size());
      for (T a : actions) {
        if (a.isSeparator()) {
          result.add(a);
        }
        else if (filter.test(a)) {
          result.add(a);
        }
      }
      return result;
    }
    return CollectionUtility.emptyArrayList();
  }

  public static Predicate<IAction> createVisibleFilter() {
    return new Predicate<IAction>() {
      @Override
      public boolean test(IAction action) {
        if (action.isVisible()) {
          // remove menu groups with no visible child action
          if (action instanceof IActionNode<?> && ((IActionNode<?>) action).hasChildActions()) {
            List<?> visibleChildActions = getActions(((IActionNode<?>) action).getChildActions(), this);
            return !visibleChildActions.isEmpty();
          }
          return true;
        }
        return false;
      }
    };
  }

  public static Predicate<IAction> createMenuFilterMenuTypes(boolean visibleOnly, IMenuType... menuTypes) {
    return createMenuFilterMenuTypes(CollectionUtility.hashSet(menuTypes), visibleOnly);

  }

  /**
   * <ul>
   * <li>If the menu is a leaf (menu without any child menus) the filter accepts a menu when it is visible (depending on
   * visibleOnly) and it has one of the passed menu types.</li>
   * <li>If the menu has child menus (is a menu group) then the filter accepts a menu if it is visible (depending on
   * visibleOnly) and at least one of its leaf children (recursively) is visible (depending on visible only) and and has
   * one of the passed menu types.</li>
   * </ul>
   *
   * @param menuTypes
   * @param visibleOnly
   * @return
   */
  public static Predicate<IAction> createMenuFilterMenuTypes(Set<? extends IMenuType> menuTypes, boolean visibleOnly) {
    return new MenuTypeFilter(menuTypes, visibleOnly);

  }

  @SafeVarargs
  public static Predicate<IAction> createCombinedFilter(final Predicate<IAction>... actionFilters) {
    if (actionFilters != null) {
      return action -> {
        for (Predicate<IAction> f : actionFilters) {
          if (!f.test(action)) {
            return false;
          }
        }
        return true;
      };
    }
    return TRUE_FILTER;
  }

  public static class MenuTypeFilter implements Predicate<IAction> {

    private final boolean m_visibleOnly;
    private final Set<? extends IMenuType> m_menuTypes;

    public MenuTypeFilter(Set<? extends IMenuType> menuTypes, boolean visibleOnly) {
      m_menuTypes = menuTypes;
      m_visibleOnly = visibleOnly;

    }

    @Override
    public boolean test(IAction action) {
      if (action instanceof IMenu) {
        IMenu menu = (IMenu) action;
        if (isVisibleOnly() && !menu.isVisible()) {
          return false;
        }
        else {
          if (menu.hasChildActions()) {
            // check for filter matching child menus
            return !normalizedActions(menu.getChildActions(), this).isEmpty();
          }
          if (getMenuTypes() != null) {
            for (IMenuType t : getMenuTypes()) {
              if (menu.getMenuTypes().contains(t)) {
                return true;
              }
            }
            return false;
          }
          else {
            return true;
          }

        }
      }
      return false;
    }

    public Set<? extends IMenuType> getMenuTypes() {
      return m_menuTypes;
    }

    public boolean isVisibleOnly() {
      return m_visibleOnly;
    }
  }
}
