// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.GroupBox = function() {
  scout.GroupBox.parent.call(this);
  this.fields = [];
  this.menus = [];
  this.staticMenus = [];
  this._addAdapterProperties(['fields', 'menus']);
  this.$body;
  this._$groupBoxTitle;

  this.controls = [];
  this.systemButtons = [];
  this.customButtons = [];
  this.processButtons = [];
};
scout.inherits(scout.GroupBox, scout.CompositeField);

scout.GroupBox.prototype._init = function(model, session) {
  scout.GroupBox.parent.prototype._init.call(this, model, session);
  this.menuBar = new scout.MenuBar(session, new scout.GroupBoxMenuItemsOrder());
  if (this.mainBox) {
    this.menuBar.large();
  }
};

/**
 * @override
 */
scout.GroupBox.prototype._createKeyStrokeAdapter = function() {
  return new scout.GroupBoxKeyStrokeAdapter(this);
};

scout.GroupBox.prototype._render = function($parent) {
  var htmlBody, i,
    env = scout.HtmlEnvironment;

  this.addContainer($parent, this.mainBox ? 'root-group-box' : 'group-box', new scout.GroupBoxLayout(this));
  if (this.mainBox) {
    this.htmlComp.layoutData = null;
  }

  this.$label = $('<span>').html(this.label);
  this._$groupBoxTitle = this.$container
    .appendDiv('group-box-title')
    .append(this.$label);
  this.addPseudoStatus();
  if (this.menuBar.position === 'top') {
    this.menuBar.render(this.$container);
    // move after title
    this.menuBar.$container.appendTo(this.$container);
  }
  this.$body = this.$container.appendDiv('group-box-body');
  htmlBody = new scout.HtmlComponent(this.$body, this.session);
  htmlBody.setLayout(new scout.LogicalGridLayout(env.formColumnGap, env.formRowGap));
  if (this.scrollable) {
    scout.scrollbars.install(this.$body, this.session, {
      axis: 'y'
    });
  }
  this._prepareFields();
  this.controls.forEach(function(control) {
    control.render(this.$body);
  }, this);
  // FIXME AWE: andere lösung finden für das hier
  // only render when 2nd argument is undefined or matches this.position
  //  if (whenPosition !== undefined && this.position !== whenPosition) {
  //    return;
  //  }
  if (this.menuBar.position === 'bottom') {
    this.menuBar.render(this.$container);
  }
};

scout.GroupBox.prototype._renderProperties = function() {
  scout.GroupBox.parent.prototype._renderProperties.call(this);

  this._renderBorderVisible(this.borderVisible);
  this._renderExpandable(this.expandable);
  this._renderExpanded(this.expanded);
};

scout.GroupBox.prototype._remove = function() {
  scout.GroupBox.parent.prototype._remove.call(this);
  if (this.menuBar) {
    this.menuBar.remove();
  }
  if (this.scrollable) {
    scout.scrollbars.uninstall(this.$body);
  }
};

scout.GroupBox.prototype._prepareFields = function() {
  this.controls = [];
  this.systemButtons = [];
  this.customButtons = [];
  this.processButtons = [];

  var i, field, res;
  for (i = 0; i < this.fields.length; i++) {
    field = this.fields[i];
    if (field instanceof scout.Button) {
      if (field.processButton) {
        this.processButtons.push(field);
        if (field.systemType !== scout.Button.SystemType.NONE) {
          this.systemButtons.push(field);
        } else {
          this.customButtons.push(field);
        }
      } else {
        this.controls.push(field);
        this._registerButtonKeyStrokes(field);
      }
    } else if (field instanceof scout.TabBox) {
      this.controls.push(field);
      for (var k = 0; k < field.tabItems.length; k++) {
        var tabMnemonic = this._getMnemonic(field.tabItems[k]);
        if (tabMnemonic) {
          this.registerRootKeyStroke(new scout.TabItemMnemonicKeyStroke(tabMnemonic, field.tabItems[k]));
        }
      }
    } else {
      this.controls.push(field);
    }
  }
};

scout.GroupBox.prototype._registerButtonKeyStrokes = function(button) {
  var mnemonic = this._getMnemonic(button);
  if (mnemonic) {
    this.keyStrokeAdapter.registerKeyStroke(new scout.ButtonMnemonicKeyStroke(mnemonic, button));
  }
  if (button.keyStrokes) {
    var i, keyStroke;
    for (i = 0; i < button.keyStrokes.length; i++) {
      keyStroke = button.keyStrokes[i];
      // FIXME [dwi][nbu] ensure proper drawing container; $drawKeyBoxContainer was removed because looking for a better solution. // keyStroke.$drawKeyBoxContainer = button.$container;
      this.keyStrokeAdapter.registerKeyStroke(keyStroke);
    }
  }
};

scout.GroupBox.prototype._getMnemonic = function(field) {
  var res;
  if (field.label !== scout.strings.removeAmpersand(field.label)) {
    //Add mnemonic keyStrokevar
    var mnemonic = field.label.match(/(^|[^&]|&&)&($|[^&]|&&)/g)[0].replace('&', '');
    res = mnemonic.charAt(mnemonic.length - 1);
  }
  return res;
};

/**
 * @override
 */
scout.GroupBox.prototype.getFields = function() {
  return this.controls;
};

scout.GroupBox.prototype._renderBorderVisible = function(borderVisible) {
  if (this.borderDecoration === 'auto') {
    borderVisible = this._computeBorderVisible(borderVisible);
  }

  if (!borderVisible) {
    this.$body.addClass('y-padding-invisible');
  }
};

//Don't include in renderProperties, it is not necessary to execute it initially because renderBorderVisible is executed already
scout.GroupBox.prototype._renderBorderDecoration = function() {
  this._renderBorderVisible(this.borderVisible);
};

/**
 *
 * @returns false if it is the mainbox. Or if the groupbox contains exactly one tablefield which has an invisible label
 */
scout.GroupBox.prototype._computeBorderVisible = function(borderVisible) {
  if (this.mainBox) {
    borderVisible = false;
  } else if (this.parent instanceof scout.GroupBox &&
    this.parent.parent instanceof scout.Form &&
    this.parent.parent.parent instanceof scout.WrappedFormField &&
    this.parent.parent.parent.parent instanceof scout.SplitBox &&
    this.parent.getFields().length === 1) {
    // Special case for wizard: wrapped form in split box with a single group box
    borderVisible = false;
  }
  return borderVisible;
};

scout.GroupBox.prototype._renderExpandable = function(expandable) {
  var $control = this._$groupBoxTitle.children('.group-box-control');

  if (expandable) {
    if ($control.length === 0) {
      // Create control if necessary
      $control = $.makeDiv('group-box-control')
        .on('click', this._onGroupBoxControlClick.bind(this))
        .prependTo(this._$groupBoxTitle);
    }
    this._$groupBoxTitle
      .addClass('expandable')
      .on('click.group-box-control', this._onGroupBoxControlClick.bind(this));
  } else {
    $control.remove();
    this._$groupBoxTitle
      .removeClass('expandable')
      .off('.group-box-control');
  }
};

scout.GroupBox.prototype._renderExpanded = function(expanded) {
  this.$container.toggleClass('collapsed', !expanded);
  if (this.borderDecoration === 'line') {
    this.$container.toggleClass('with-line', !expanded);
  }

  // Group boxes have set "useUiHeight=true" by default. When a group box is collapsed, it should not
  // stretched vertically (no "weight Y"). However, because "weightY" is -1 by default, a calculated value
  // is assigned (LogicalGridData._inheritWeightY()) that is based on the group boxes height. In collapsed
  // state, this height would be wrong. Therefore, we manually assign "weightY=0" to collapsed group boxes
  // to prevent them from beeing stretched.
  if (this.expanded) {
    // If group box was previously collapsed, restore original "weightY" griaData value
    if (this._collapsedWeightY !== undefined) {
      this.gridData.weightY = this._collapsedWeightY;
      delete this._collapsedWeightY;
    }
    // Update inner layout (e.g. menubar)
    this.invalidateLayout();
  } else {
    // If group box has a weight different than 0, we set it to zero and back up the old value
    if (this.gridData.weightY !== 0) {
      this._collapsedWeightY = this.gridData.weightY;
      this.gridData.weightY = 0;
    }
  }

  this.invalidateLayoutTree();
};

/**
 * @override
 */
scout.GroupBox.prototype._renderLabelVisible = function(visible) {
  this._$groupBoxTitle.setVisible(visible && this.label && !this.mainBox);
};

scout.GroupBox.prototype._renderMenus = function() {
  var menu,
    menus = this.menus,
    menuItems = this.staticMenus.concat(menus);

  // create a menu-adapter for each process button
  this.processButtons.forEach(function(button) {
    menu = scout.localObjects.createObject(this.session,
      scout.ButtonAdapterMenu.adaptButtonProperties(button, {
        objectType: 'ButtonAdapterMenu',
        button: button
    }));
    menuItems.push(menu);
  }, this);

  // register keystrokes on root group-box
  menuItems.forEach(function(menuItem) {
    this.registerRootKeyStroke(menuItem);
    this._registerButtonKeyStrokes(menuItem);
  }, this);

  this.menuBar.updateItems(menuItems);
};

scout.GroupBox.prototype._removeMenus = function(menus) {
  menus.forEach(function(menu) {
    menu.remove();
  });
};

scout.GroupBox.prototype._onGroupBoxControlClick = function(event) {
  if (this.expandable) {
    this.setGroupBoxExpanded(!this.expanded);
  }
  $.suppressEvent(event); // otherwise, the event would be triggered twice sometimes (by group-box-control and group-box-title)
};

scout.GroupBox.prototype.setGroupBoxExpanded = function(expanded) {
  if (this.expanded !== expanded) {
    this.expanded = expanded;
    this.remoteHandler(this.id, 'expanded', {
      expanded: expanded
    });
  }
  if (this.rendered) {
    this._renderExpanded(expanded);
  }
};
