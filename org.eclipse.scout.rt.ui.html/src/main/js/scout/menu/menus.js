/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
scout.menus = {

  filterAccordingToSelection: function(prefix, selectionLength, menus, destination, onlyVisible, enableDisableKeyStroke, notAllowedTypes) {
    var allowedTypes = [];

    if (destination === scout.MenuDestinations.MENU_BAR) {
      allowedTypes = [prefix + '.EmptySpace', prefix + '.SingleSelection', prefix + '.MultiSelection'];
    } else if (destination === scout.MenuDestinations.CONTEXT_MENU) {
      allowedTypes = [prefix + '.SingleSelection', prefix + '.MultiSelection'];
    } else if (destination === scout.MenuDestinations.HEADER) {
      allowedTypes = [prefix + '.Header'];
    }

    if (allowedTypes.indexOf(prefix + '.SingleSelection') > -1 && selectionLength !== 1) {
      scout.arrays.remove(allowedTypes, prefix + '.SingleSelection');
    }
    if (allowedTypes.indexOf(prefix + '.MultiSelection') > -1 && selectionLength <= 1) {
      scout.arrays.remove(allowedTypes, prefix + '.MultiSelection');
    }
    notAllowedTypes = scout.arrays.ensure(notAllowedTypes);
    var fixedNotAllowedTypes = [];
    //ensure prefix
    prefix = prefix + '.';
    notAllowedTypes.forEach(function(type) {
      if (type.slice(0, prefix.length) !== prefix) {
        type = prefix + type;
      }
      fixedNotAllowedTypes.push(type);
    }, this);
    return scout.menus.filter(menus, allowedTypes, onlyVisible, enableDisableKeyStroke, fixedNotAllowedTypes);
  },

  /**
   * Filters menus that don't match the given types, or in other words: only menus with the given types are returned
   * from this method. The visible state is only checked if the parameter onlyVisible is set to true. Otherwise invisible items are returned and added to the
   * menu-bar DOM (invisible, however). They may change their visible state later. If there are any types in notAllowedTypes each menu is checked also against
   * these types and if they are matching the menu is filtered.
   */
  filter: function(menus, types, onlyVisible, enableDisableKeyStrokes, notAllowedTypes) {
    if (!menus) {
      return;
    }
    types = scout.arrays.ensure(types);
    notAllowedTypes = scout.arrays.ensure(notAllowedTypes);

    var filteredMenus = [],
      separatorCount = 0;

    menus.forEach(function(menu) {
      var childMenus = menu.childActions;
      if (childMenus.length > 0) {
        childMenus = scout.menus.filter(childMenus, types, onlyVisible, enableDisableKeyStrokes, notAllowedTypes);
        if (childMenus.length === 0) {
          scout.menus._enableDisableMenuKeyStroke(menu, enableDisableKeyStrokes, true);
          return;
        }
      } // Don't check the menu type for a group
      else if (!scout.menus._checkType(menu, types) || (notAllowedTypes.length !== 0 && scout.menus._checkType(menu, notAllowedTypes))) {
        scout.menus._enableDisableMenuKeyStroke(menu, enableDisableKeyStrokes, true);
        return;
      }

      if (onlyVisible && !menu.visible) {
        scout.menus._enableDisableMenuKeyStroke(menu, enableDisableKeyStrokes, true);
        return;
      }
      if (menu.separator) {
        separatorCount++;
      }
      scout.menus._enableDisableMenuKeyStroke(menu, enableDisableKeyStrokes, false);
      filteredMenus.push(menu);
    });

    // Ignore menus with only separators
    if (separatorCount === filteredMenus.length) {
      return [];
    }
    return filteredMenus;
  },

  /**
   * Makes leading, trailing and duplicate separators invisible or reverts the visibility change if needed.
   */
  updateSeparatorVisibility: function(menus) {
    menus = scout.arrays.ensure(menus);

    menus = menus.filter(function(menu) {
      return menu.visible || menu.separator;
    });

    if (menus.length === 0) {
      return;
    }

    var hasMenuBefore = false;
    var hasMenuAfter = false;
    menus.forEach(function(menu, i) {
      if (menu.ellipsis) {
        return;
      }
      if (!menu.separator) {
        hasMenuBefore = true;
        return;
      }
      hasMenuAfter = menus[i + 1] && !menus[i + 1].separator && !menus[i + 1].ellipsis;

      // If the separator has a separator next to it, make it invisible
      if (!hasMenuBefore || !hasMenuAfter) {
        if (menu.visibleOrig === undefined) {
          menu.visibleOrig = menu.visible;
          menu.setVisible(false);
        }
      } else if (menu.visibleOrig !== undefined) {
        // Revert to original state
        menu.setVisible(menu.visibleOrig);
        menu.visibleOrig = undefined;
      }
    });
  },

  checkType: function(menu, types) {
    types = scout.arrays.ensure(types);
    if (menu.childActions.length > 0) {
      var childMenus = scout.menus.filter(menu.childActions, types);
      return (childMenus.length > 0);
    }
    return scout.menus._checkType(menu, types);
  },

  _enableDisableMenuKeyStroke: function(menu, activated, exclude) {
    if (activated) {
      menu.excludedByFilter = exclude;
    }
  },

  /**
   * Checks the type of a menu. Don't use this for menu groups.
   */
  _checkType: function(menu, types) {
    if (!types || types.length === 0) {
      return false;
    }
    if (!menu.menuTypes) {
      return false;
    }
    for (var j = 0; j < types.length; j++) {
      if (menu.menuTypes.indexOf(types[j]) > -1) {
        return true;
      }
    }
  },

  createEllipsisMenu: function(options) {
    var defaults = {
      iconId: scout.icons.ELLIPSIS_V,
      tabbable: false
    };
    options = $.extend({}, defaults, options);
    return scout.create('Menu', options);
  },

  moveMenuIntoEllipsis: function(menu, ellipsis) {
    menu.remove();
    menu.overflow = true;
    menu.overflowMenu = ellipsis;

    var menusInEllipsis = ellipsis.childActions.slice();
    menusInEllipsis.unshift(menu); // add as first element
    ellipsis.setChildActions(menusInEllipsis);
  },

  removeMenuFromEllipsis: function(menu, $parent) {
    menu.overflow = false;
    menu.overflowMenu = null;
    if (!menu.rendered) {
      menu.render($parent);
    }
  }
};

scout.MenuDestinations = {
  MENU_BAR: 1,
  CONTEXT_MENU: 2,
  HEADER: 3
};
