scout.MenuBarLayout = function(menuBar) {
  scout.MenuBarLayout.parent.call(this);
  this._menuBar = menuBar;
  this._ellipsis;
};
scout.inherits(scout.MenuBarLayout, scout.AbstractLayout);

// FIXME AWE: add tabindex=0 for ellipsis menu-item

/**
 * @override AbstractLayout.js
 */
scout.MenuBarLayout.prototype.layout = function($container) {
  // check if all menu items have enough room to be displayed without ellipsis
  this._removeEllipsis();
  this._menuBar.updateItems(this._menuBar.menuItems, true);

  var ellipsisSize, leftEnd = 0, rightEnd, overflown,
    oldOverflow = $container.css('overflow');

  // we cannot set overflow in MenuBar.css because overflow:hidden would cut off the
  // focus border on the left-most button in the menu-bar. That's why we must reset
  // the overflow-property after we've checked if the menu-bar is over-sized.
  $container.css('overflow', 'hidden');
  rightEnd = $container[0].clientWidth;

  // 1st find the left-most position of all right-aligned items
  // see: special comment for negative margins in Menu.css
  this._menuBar.menuItems.forEach(function(menuItem) {
    var tmpX, itemBounds = scout.graphics.bounds(menuItem.$container, true, true);
    if (isRightAligned(menuItem)) {
      tmpX = itemBounds.x;
      if (tmpX < rightEnd) {
        rightEnd = tmpX;
      }
    } else {
      tmpX = itemBounds.x + itemBounds.width;
      if (tmpX > leftEnd) {
        leftEnd = tmpX;
      }
    }
  });

  overflown = leftEnd > rightEnd;
  $container.css('overflow', oldOverflow);
  $.log.info('leftEnd=' + leftEnd + ' rightEnd=' + rightEnd + ' overflown=' + overflown);

  if (overflown) {

    // add ellipsis icon
    this._renderEllipsis($container);
    ellipsisSize = scout.graphics.getSize(this._ellipsis.$container, true);
    rightEnd -= ellipsisSize.width;

    // right-aligned menus are never put into the overflow ellipsis-menu
    // or in other words: they're not responsive.
    // for left-aligned menus: once we notice a menu-item that does not
    // fit into the available space, all following items must also be
    // put into the overflow ellipsis-menu. Otherwise you would put
    // an item with a long text into the ellipsis-menu, but the next
    // icon, with a short text would still be in the menu-bar. Which would
    // be confusing, as it would look like we've changed the order of the
    // menu-items.
    var overflowNextItems = false;
    this._menuBar.menuItems.forEach(function(menuItem) {
      if (!isRightAligned(menuItem)) {
        var itemBounds = scout.graphics.bounds(menuItem.$container, true, true),
          rightOuterX = itemBounds.x + itemBounds.width;
        if (overflowNextItems || rightOuterX > rightEnd) {
          menuItem.remove();
          // FIXME AWE: hier eine property setzen, für popup/overflow/style
          this._ellipsis.childActions.push(menuItem);
          overflowNextItems = true;
        }
      }
    }, this);
  }

  function isRightAligned(menuItem) {
    return menuItem.$container.hasClass('right-aligned');
  }
};

scout.MenuBarLayout.prototype._renderEllipsis = function($container) {
  var ellipsis = this._menuBar.session.createUiObject({
    objectType: 'Menu',
    horizontalAlignment: 1,
    iconId: 'font:\uF143'
  });
  ellipsis.render($container);
  this._ellipsis = ellipsis;
};

scout.MenuBarLayout.prototype._removeEllipsis = function() {
  if (this._ellipsis) {
    this._ellipsis.remove(); // FIXME AWE: do not destroy childActions! check!
    this._ellipsis = null;
  }
};

/**
 * @override AbstractLayout.js
 */
scout.MenuBarLayout.prototype.preferredLayoutSize = function($container) {
  $.log.info('(MenuBarLayout#preferredLayoutSize)');

  var prefSize,
    oldWidth = $container.css('width'),
    containerInsets = scout.graphics.getInsets($container, {includeMargin: true});

  $container.css('width', '100%');
  prefSize = scout.graphics.getVisibleSize($container);
  prefSize.width -= containerInsets.left;
  prefSize.width -= containerInsets.right;
  $container.css('width', oldWidth);
  return prefSize;
};

