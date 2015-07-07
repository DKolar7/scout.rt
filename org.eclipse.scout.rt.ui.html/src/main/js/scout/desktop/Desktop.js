scout.Desktop = function() {
  scout.Desktop.parent.call(this);

  this._$viewTabBar;
  this._$taskBar;
  this._$toolBar;
  this.$bench;

  this.navigation;
  // FIXME DWI: (von A.WE) this collection should be moved/merged to/with FormController
  this._allViewTabs = [];
  /**
   * outline-content = outline form or table
   */
  this._outlineContent;
  this._selectedViewTab;

  /**
   * FIXME DWI: (activeForm): selectedTool wird nun auch als 'activeForm' verwendet (siehe TableKeystrokeAdapter.js)
   * Wahrscheinlich müssen wir das refactoren und eine activeForm property verwenden.  Diese Property muss
   * mit dem Server synchronisiert werden, damit auch das server-seitige desktop.getActiveForm() stimmt.
   * Auch im zusammenhang mit focus-handling nochmals überdenken.
   */
  this.selectedTool;
  this._addAdapterProperties(['viewButtons', 'actions', 'views', 'dialogs', 'outline', 'messageBoxes', 'fileChoosers', 'addOns', 'keyStrokes']);
  this._formController;
  this._messageBoxController;
};
scout.inherits(scout.Desktop, scout.BaseDesktop);

scout.Desktop.prototype.init = function(model, session) {
  scout.Desktop.parent.prototype.init.call(this, model, session);

  // Prepare FormController
  this._formController = new scout.FormController(this, session,
    function() { // callback to access dialogs attached to the Desktop.
      return this.dialogs;
    }.bind(this),
    function() { // callback to access views attached to the Desktop.
      return this.views;
    }.bind(this)
  );
  // Prepare MessageBoxController
  this._messageBoxController = new scout.MessageBoxController(this, session,
    function() { // callback to access message boxes attached to the Desktop.
      return this.messageBoxes;
    }.bind(this)
  );
  // Prepare FileChooserController
  this._fileChooserController = new scout.FileChooserController(this, session,
    function() { // callback to access file choosers attached to the Desktop.
      return this.fileChoosers;
    }.bind(this)
  );
};

scout.DesktopStyle = {
  DEFAULT: 'DEFAULT',
  BENCH: 'BENCH'
};

scout.Desktop.prototype.onChildAdapterCreated = function(propertyName, adapter) {
  if (propertyName === 'viewButtons') {
    adapter.desktop = this;
  } else if (propertyName === 'actions') {
    adapter.desktop = this;
  }
};

scout.Desktop.prototype._render = function($parent) {
  var hasNavigation = this._hasNavigation(),
    hasTaskBar = this._hasTaskBar();

  this.$container = $parent;
  this.$container.toggleClass('has-navigation', hasNavigation);
  this._renderUniqueId($parent);
  this._renderModelClass($parent);

  this.navigation = hasNavigation ? new scout.DesktopNavigation(this) : scout.NullDesktopNavigation;
  this.navigation.render($parent);
  this._renderTaskBar($parent);

  this.$bench = this.$container.appendDiv('desktop-bench');
  this.$bench.toggleClass('has-taskbar', hasTaskBar);
  new scout.HtmlComponent(this.$bench, this.session);
  this._createSplitter($parent);
  this.addOns.forEach(function(addOn) {
    addOn.render($parent);
  });

  this._renderToolMenus();
  this.navigation.onOutlineChanged(this.outline);
  this._setSplitterPosition();

  // Display attached forms, message boxes and file choosers.
  this._formController.showAll();
  this._messageBoxController.showAll();
  this._fileChooserController.showAll();

  $(window).on('resize', this.onResize.bind(this));

  // prevent general drag and drop, dropping a file anywhere in the application must not open this file in browser
  this._setupDragAndDrop();

  // Switch off browser's default context menu for the entire scout desktop (except input fields)
  $parent.bind('contextmenu', function(event) {
    if (event.target.nodeName !== 'INPUT' && event.target.nodeName !== 'TEXTAREA' && !event.target.isContentEditable) {
      event.preventDefault();
    }
  });
  scout.keyStrokeManager.installAdapter($parent, new scout.DesktopKeyStrokeAdapter(this));
};

scout.Desktop.prototype._renderToolMenus = function() {
  if (!this._hasTaskBar()) {
    return;
  }
  // we set the menuStyle property to render a menu with a different style
  // depending on where the menu is located (taskbar VS menubar).
  var i, action;
  for (i = 0; i < this.actions.length; i++) {
    action = this.actions[i];
    action.actionStyle = scout.Action.ActionStyle.TASK_BAR;
    action.render(this._$toolBar);
  }
  if (action) {
    action.$container.addClass('last');
  }
  if (this.selectedTool) {
    this.selectedTool.popup.alignTo();
  }
};

scout.Desktop.prototype._renderTaskBar = function($parent) {
  if (!this._hasTaskBar()) {
    return;
  }
  this._$taskBar = $parent.appendDiv('desktop-taskbar');
  var htmlTabbar = new scout.HtmlComponent(this._$taskBar, this.session);
  htmlTabbar.setLayout(new scout.DesktopTabBarLayout(this));
  this._$taskBar.appendDiv('taskbar-logo')
    .delay(1000)
    .animateAVCSD('width', 40, null, null, 1000);
  this._$viewTabBar = this._$taskBar.appendDiv('desktop-view-tabs');
  this._$toolBar = this._$taskBar.appendDiv('taskbar-tools');
};

scout.Desktop.prototype._setupDragAndDrop = function() {
  var dragEnterOrOver = function (event) {
    event.stopPropagation();
    event.preventDefault();
    // change cursor to forbidden (no dropping allowed)
    event.originalEvent.dataTransfer.dropEffect = 'none';
  };

  this.$container.on('dragenter', dragEnterOrOver);
  this.$container.on('dragover', dragEnterOrOver);
  this.$container.on('drop', function (event) {
    event.stopPropagation();
    event.preventDefault();
  });
},

scout.Desktop.prototype._createSplitter = function($parent) {
  if (!this._hasNavigation()) {
    return;
  }
  this.splitter = new scout.Splitter({
    $anchor: this.navigation.$navigation,
    $root: this.$container,
    maxRatio: 0.5
  });
  this.splitter.render($parent);
  this.splitter.on('resize', this._onSplitterResize.bind(this));
  this.splitter.on('resizeend', this._onSplitterResizeEnd.bind(this));
};

scout.Desktop.prototype._setSplitterPosition = function() {
  if (!this._hasNavigation()) {
    return;
  }
  // FIXME AWE: (user-prefs) Use user-preferences instead of sessionStorage
  var storedSplitterPosition = sessionStorage.getItem('scout:desktopSplitterPosition');
  if (storedSplitterPosition) {
    // Restore splitter position
    var splitterPosition = parseInt(storedSplitterPosition, 10);
    this.splitter.updatePosition(splitterPosition);
    this._handleUpdateSplitterPosition(splitterPosition);
  }
  else {
    // Set initial splitter position
    this.splitter.updatePosition();
    this._handleUpdateSplitterPosition(this.splitter.positoin);
  }
};

scout.Desktop.prototype._hasNavigation = function() {
  return this.desktopStyle === scout.DesktopStyle.DEFAULT;
};

scout.Desktop.prototype._hasTaskBar = function() {
  return this.desktopStyle === scout.DesktopStyle.DEFAULT;
};

// FIXME AWE/CGU this is called by JQuery UI when a dialog gets resized, why?
scout.Desktop.prototype.onResize = function(event) {
  if (this._selectedViewTab) {
    this._selectedViewTab.onResize();
  }
  if (this.outline) {
    this.outline.onResize();
  }
  if (this._outlineContent) {
    this._outlineContent.onResize();
  }
  this._layoutTaskBar();
};

scout.Desktop.prototype._layoutTaskBar = function() {
  if (this._hasTaskBar()) {
    var htmlTaskBar = scout.HtmlComponent.get(this._$taskBar);
    htmlTaskBar.revalidateLayout();
  }
};

scout.Desktop.prototype._onSplitterResize = function(event) {
  this._handleUpdateSplitterPosition(event.data);
};

scout.Desktop.prototype._onSplitterResizeEnd = function(event) {
  var splitterPosition = event.data;

  // Store size
  sessionStorage.setItem('scout:desktopSplitterPosition', splitterPosition);

  // Check if splitter is smaller than min size
  if (splitterPosition < scout.DesktopNavigation.BREADCRUMB_SWITCH_WIDTH) {
    // Set width of navigation to BREADCRUMB_SWITCH_WIDTH, using an animation.
    // While animating, update the desktop layout.
    // At the end of the animation, update the desktop layout, and store the splitter position.
    this.navigation.$navigation.animate({
      width: scout.DesktopNavigation.BREADCRUMB_SWITCH_WIDTH
    }, {
      progress: function() {
        this.splitter.updatePosition();
        this._handleUpdateSplitterPosition(this.splitter.position);
      }.bind(this),
      complete: function() {
        this.splitter.updatePosition();
        // Store size
        sessionStorage.setItem('scout:desktopSplitterPosition', this.splitter.position);
        this._handleUpdateSplitterPosition(this.splitter.position);
      }.bind(this)
    });
  }
};

scout.Desktop.prototype._handleUpdateSplitterPosition = function(newPosition) {
  this.navigation.onResize({data: newPosition});
  this.onResize({data: newPosition});
};

scout.Desktop.prototype._addTab = function(viewTab) {
  this._allViewTabs.push(viewTab);
  viewTab.events.on('removed', this._removeTab.bind(this, viewTab)); // FIXME AWE: un-register?
  this._setSelectedTab(viewTab);
};

scout.Desktop.prototype._removeTab = function(viewTab) {
  scout.arrays.remove(this._allViewTabs, viewTab);
  viewTab.remove();

  // FIXME DWI: (activeForm) use activeForm here or when no form is active, show outline again (from A.WE)

  // Only change 'tab selection' if the tab to be removed was the active one.
  if (this._selectedViewTab === viewTab) {
    if (this._allViewTabs.length > 0) {
      this._setSelectedTab(this._allViewTabs[this._allViewTabs.length - 1]);
    } else {
      this._attachOutlineContent();
      this._bringNavigationToFront();
      this._selectedViewTab = null;
    }
  }

  this._layoutTaskBar();
};

scout.Desktop.prototype._setSelectedTab = function(viewTab) {
  if (this._selectedViewTab !== viewTab) {
    this._sendNavigationToBack();
    this._detachOutlineContent();
    this._deselectViewTab();
    this._selectViewTab(viewTab);
    this._layoutTaskBar();
    scout.focusManager.validateFocus(this.session.uiSessionId, 'desktop');
  }
};

scout.Desktop.prototype._detachOutlineContent = function() {
  if (this._outlineContent) {
    var $outlineContent = this._outlineContent.$container;
    this.session.detachHelper.beforeDetach($outlineContent);
    $outlineContent.detach();
  }
};

scout.Desktop.prototype._attachOutlineContent = function() {
  if (this._outlineContent) {
    var $outlineContent = this._outlineContent.$container;
    this.$bench.append($outlineContent);
    this.session.detachHelper.afterAttach($outlineContent);

    // If the parent has been resized while the content was not visible, the content has the wrong size -> update
    var htmlComp = scout.HtmlComponent.get($outlineContent);
    var htmlParent = htmlComp.getParent();
    htmlComp.setSize(htmlParent.getSize());
  }
};

/**
 * De-selects the currently selected tab.
 */
scout.Desktop.prototype._deselectViewTab = function() {
 if (this._selectedViewTab) {
   this._selectedViewTab.deselect();
   this._selectedViewTab = null;
 }
};

scout.Desktop.prototype._selectViewTab = function(viewTab) {
  viewTab.select();
  this._selectedViewTab = viewTab;
};

scout.Desktop.TargetWindow = {
  AUTO: 'AUTO',
  SELF: 'SELF',
  BLANK: 'BLANK'
};

scout.Desktop.prototype._openUri = function(event) {
  if (!event.uri) {
    return;
  }
  var newWindow = false;
  if (scout.Desktop.TargetWindow.BLANK === event.uriTarget) {
    newWindow = true;
  } else if (scout.Desktop.TargetWindow.SELF === event.uriTarget) {
    newWindow = false;
  }

  $.log.debug('(Desktop#_openUri) uri=' + event.uri + ' target=' + event.uriTarget + ' newWindow=' + newWindow);
  if (newWindow) {
    window.open(event.uri);
  } else {
    window.location.href = event.uri;
  }
};

/* communication with outline */

scout.Desktop.prototype.setOutlineContent = function(content) {
  if (this._outlineContent && this._outlineContent !== content) {
    if (scout.keyStrokeManager.isAdapterInstalled(this._outlineContent.keyStrokeAdapter)) {
      scout.keyStrokeManager.uninstallAdapter(this._outlineContent.keyStrokeAdapter);
    }
    this._outlineContent.remove();
    this._outlineContent = null;
  }

  if (!content) {
    return;
  }

  this._outlineContent = content;
  this._deselectViewTab();
  this._bringNavigationToFront();

  if (!content.rendered) {
    if (content instanceof scout.Table) {
      content.menuBar.top();
      content.menuBar.large();
    }
    content.render(this.$bench);

    // Request focus on first element in new outlineTab.
    scout.focusManager.validateFocus(this.session.uiSessionId);

    // FIXME CGU: maybe include in render?
    content.htmlComp.validateLayout();
    content.htmlComp.validateRoot = true;
  }

  // Request focus on first element in new outlineTab.
  scout.focusManager.validateFocus(this.session.uiSessionId, 'update');
};

scout.Desktop.prototype.setOutline = function(outline) {
  this.outline = outline;
  this.navigation.onOutlineChanged(this.outline);
};

scout.Desktop.prototype._onModelOutlineChanged = function(event) {
  if (scout.DesktopStyle.DEFAULT === this.desktopStyle) {
    this.setOutline(this.session.getOrCreateModelAdapter(event.outline, this));
  }
};

scout.Desktop.prototype.onModelAction = function(event) {
  if (event.type === 'formShow') {
    this._formController.addAndShow(event.form);
  } else if (event.type === 'formHide') {
    this._formController.removeAndHide(event.form);
  } else if (event.type === 'formActivate') {
    this._formController.activateForm(event.form);
  } else if (event.type === 'outlineChanged') {
    this._onModelOutlineChanged(event);
  } else if (event.type === 'messageBoxShow') {
    this._messageBoxController.addAndShow(event.messageBox);
  } else if (event.type === 'messageBoxHide') {
    this._messageBoxController.removeAndHide(event.messageBox);
  } else if (event.type === 'fileChooserShow') {
    this._fileChooserController.addAndShow(event.fileChooser);
  } else if (event.type === 'fileChooserHide') {
    this._fileChooserController.removeAndHide(event.fileChooser);
  } else if (event.type === 'openUri') {
    this._openUri(event);
  } else {
    scout.Desktop.parent.prototype.onModelAction.call(this, event);
  }
  scout.focusManager.validateFocus(this.session.uiSessionId);
};

scout.Desktop.prototype.tabCount = function() {
  return this._allViewTabs.length;
};

scout.Desktop.prototype.bringOutlineToFront = function(outline) {
  this._deselectViewTab();
  if (this.outline === outline) {
    if (this.outline.inBackground) {
      this._attachOutlineContent();
    }
  } else {
    this.setOutline(outline);
  }
  this._bringNavigationToFront();
};

/**
 * Called after width of navigation has been updated.
 */
scout.Desktop.prototype.navigationWidthUpdated = function(navigationWidth) {
  if (this._hasNavigation()) {
    this._$taskBar.css('left', navigationWidth);
    this.$bench.css('left', navigationWidth);
  }
};

scout.Desktop.prototype._bringNavigationToFront = function () {
  this.navigation.bringToFront();
  this._renderBenchDropShadow(false);
};

scout.Desktop.prototype._sendNavigationToBack = function () {
  this.navigation.sendToBack();
  this._renderBenchDropShadow(true);
};

scout.Desktop.prototype._renderBenchDropShadow = function(showShadow) {
  if (this._hasNavigation()) {
    this.$bench.toggleClass('drop-shadow', showShadow);
  }
};
