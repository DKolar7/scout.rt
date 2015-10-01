scout.Desktop = function() {
  scout.Desktop.parent.call(this);

  this._$viewTabBar;
  this._$taskBar; // FIXME AWE: uniform naming
  this._$toolBar; // FIXME AWE: uniform naming
  this.$bench;

  this.navigation;
  /**
   * outline-content = outline form or table
   */
  this._outlineContent;

  /**
   * FIXME DWI: (activeForm): selected tool form action wird nun auch als 'activeForm' verwendet (siehe TableKeystrokeContext.js)
   * Wahrscheinlich müssen wir das refactoren und eine activeForm property verwenden.  Diese Property muss
   * mit dem Server synchronisiert werden, damit auch das server-seitige desktop.getActiveForm() stimmt.
   * Auch im zusammenhang mit focus-handling nochmals überdenken.
   */
  this._addAdapterProperties(['viewButtons', 'actions', 'views', 'dialogs', 'outline', 'messageBoxes', 'fileChoosers', 'addOns', 'keyStrokes']);

  this.viewTabsController;
  this.formController;
  this.messageBoxController;
  this.fileChooserController;
  this.benchVisible = true;
  this.suppressSetActiveForm = false;
};
scout.inherits(scout.Desktop, scout.BaseDesktop);

scout.Desktop.prototype._init = function(model) {
  scout.Desktop.parent.prototype._init.call(this, model);
  this.viewTabsController = new scout.ViewTabsController(this);
  this.formController = new scout.FormController(this, model.session);
  this.messageBoxController = new scout.MessageBoxController(this, model.session);
  this.fileChooserController = new scout.FileChooserController(this, model.session);
  this._addNullOutline(model.outline);
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
  this.$container
    .addClass('desktop')
    .toggleClass('has-navigation', hasNavigation);
  this._renderUniqueId($parent);
  this._renderModelClass($parent);

  this.navigation = hasNavigation ? new scout.DesktopNavigation(this) : scout.NullDesktopNavigation;
  this.navigation.render($parent);
  //TODO maybe better move to desktop navigation?
  this._installKeyStrokeContextForDesktopViewButtonBar();

  this._renderTaskBar($parent);
  this._renderBench();
  this._createSplitter($parent);
  this.addOns.forEach(function(addOn) {
    addOn.render($parent);
  });

  this._renderToolMenus();
  this.navigation.onOutlineChanged(this.outline, true);
  this._setSplitterPosition();

  $(window).on('resize', this.onResize.bind(this));

  // prevent general drag and drop, dropping a file anywhere in the application must not open this file in browser
  this._setupDragAndDrop();

  // Switch off browser's default context menu for the entire scout desktop (except input fields)
  $parent.bind('contextmenu', function(event) {
    if (event.target.nodeName !== 'INPUT' && event.target.nodeName !== 'TEXTAREA' && !event.target.isContentEditable) {
      event.preventDefault();
    }
  });
};

/**
 * goes up in display hierarchy to find the form to select on desktop. null if outline is selected.
 * @param form
 * @returns
 */
scout.Desktop.prototype._findActiveSelectablePart = function(form) {
  if (form.parent.isView && form.parent.isDialog) {
    if (form.parent.isView()) {
      return form.parent;
    } else if (form.parent.isDialog()) {
      return this._findActiveSelectablePart(form.parent);
    }
  }
  return null;
};

/**
 * Installs the keystrokes referring to the desktop bench, and are keystrokes declared on desktop (desktop.keyStrokes).
 */
scout.Desktop.prototype._installKeyStrokeContextForDesktopBench = function() {
  if (!this._hasBench()) {
    return;
  }
  var keyStrokeContext = new scout.KeyStrokeContext();

  keyStrokeContext.$bindTarget = this.session.$entryPoint;
  keyStrokeContext.$scopeTarget = this.$bench;
  keyStrokeContext.registerKeyStroke(this.keyStrokes);

  this.session.keyStrokeManager.installKeyStrokeContext(keyStrokeContext);
};

/**
 * Installs the keystrokes referring to the desktop view button area, and are keystrokes to switch between outlines (desktop.viewButtons).
 */
scout.Desktop.prototype._installKeyStrokeContextForDesktopViewButtonBar = function() {
  if (!this._hasNavigation()) {
    return;
  }
  var keyStrokeContext = new scout.KeyStrokeContext();

  keyStrokeContext.$bindTarget = this.session.$entryPoint;
  keyStrokeContext.$scopeTarget = this.navigation.$viewButtons;
  keyStrokeContext.registerKeyStroke([
    new scout.ViewMenuOpenKeyStroke(this.navigation)
  ].concat(this.viewButtons));

  this.session.keyStrokeManager.installKeyStrokeContext(keyStrokeContext);
};

/**
 * Installs the keystrokes referring to the desktop task bar, and are keystrokes associated with FormToolButtons (desktop.actions).
 */
scout.Desktop.prototype._installKeyStrokeContextForDesktopTaskBar = function() {
  if (!this._hasTaskBar()) {
    return;
  }
  var keyStrokeContext = new scout.KeyStrokeContext();

  keyStrokeContext.$bindTarget = this.session.$entryPoint;
  keyStrokeContext.$scopeTarget = this._$taskBar;
  keyStrokeContext.registerKeyStroke([
    new scout.ViewTabSelectKeyStroke(this),
    new scout.DisableBrowserTabSwitchingKeyStroke(this)
  ].concat(this.actions));

  this.session.keyStrokeManager.installKeyStrokeContext(keyStrokeContext);
};

scout.Desktop.prototype._postRender = function() {
  //keystroke is not handled by default keystrokecontext.
  this.session.keyStrokeManager.uninstallKeyStrokeContext(this.keyStrokeContext);

  // Render attached forms, message boxes and file choosers.
  this.formController.render();
  this.messageBoxController.render();
  this.fileChooserController.render();

  // Align a potential open popup to its respective tool button.
  this.actions
    .filter(function(action) {
      return action.selected && action.popup;
    })
    .some(function(action) {
      action.popup.position();
      return true;
    });

  //find active form and set selected.
  var selectable;
  this.suppressSetActiveForm = true;
  if (this.activeForm) {
    var form = this.session.getModelAdapter(this.activeForm);
    if (form.isDialog()) {
      //find ui selectable part
      selectable = this._findActiveSelectablePart(form);
    } else if (form.isView()) {
      selectable = form;
    }
  }
  if (!selectable) {
    this.bringOutlineToFront(this.outline);
  } else {
    this.viewTabsController.selectViewTab(this.viewTabsController.viewTab(selectable));
  }
  this.suppressSetActiveForm = false;
};

scout.Desktop.prototype._renderActiveForm = function($parent) {
  //nop -> is handled in _setFormActivated when ui changes active form or if model changes form in _onModelFormShow/_onModelFormActivate
};

scout.Desktop.prototype._renderToolMenus = function() {
  if (!this._hasTaskBar()) {
    return;
  }

  // we set the menuStyle property to render a menu with a different style
  // depending on where the menu is located (taskbar VS menubar).
  this.actions.forEach(function(action) {
    action._customCssClasses = "taskbar-tool-item";
    action.popupOpeningDirectionX = 'left';
    action.render(this._$toolBar);
  }.bind(this));

  if (this.actions.length) {
    this.actions[0].$container.addClass('last');
  }
};

scout.Desktop.prototype._renderBench = function() {
  if (!this._hasBench()) {
    return;
  }
  this.$bench = this.$container.appendDiv('desktop-bench');
  this.$bench.toggleClass('has-taskbar', this._hasTaskBar());
  new scout.HtmlComponent(this.$bench, this.session);

  this._installKeyStrokeContextForDesktopBench();
};

scout.Desktop.prototype._removeBench = function() {
  if (!this.$bench) {
    return;
  }
  this.$bench.remove();
  this.$bench = null;
};

scout.Desktop.prototype._renderBenchVisible = function() {
  if (this.benchVisible) {
    this._renderBench();
  } else {
    this._removeBench();
  }
};

scout.Desktop.prototype._renderTaskBar = function($parent) {
  if (!this._hasTaskBar()) {
    return;
  }
  this._$taskBar = $parent.appendDiv('desktop-taskbar');
  var htmlTabbar = new scout.HtmlComponent(this._$taskBar, this.session);
  htmlTabbar.setLayout(new scout.DesktopTabBarLayout(this));
  if (this.session.uiUseTaskbarLogo) {
    this._$taskBarLogo = this._$taskBar.appendDiv('taskbar-logo');
  }
  this._$viewTabBar = this._$taskBar.appendDiv('desktop-view-tabs');
  this._$toolBar = this._$taskBar.appendDiv('taskbar-tools');

  this._installKeyStrokeContextForDesktopTaskBar();
};

scout.Desktop.prototype._setupDragAndDrop = function() {
  var dragEnterOrOver = function(event) {
    event.stopPropagation();
    event.preventDefault();
    // change cursor to forbidden (no dropping allowed)
    event.originalEvent.dataTransfer.dropEffect = 'none';
  };

  this.$container.on('dragenter', dragEnterOrOver);
  this.$container.on('dragover', dragEnterOrOver);
  this.$container.on('drop', function(event) {
    event.stopPropagation();
    event.preventDefault();
  });
},

scout.Desktop.prototype._createSplitter = function($parent) {
  if (!this._hasNavigation()) {
    return;
  }
  this.splitter = scout.create(scout.Splitter, {
    parent: this,
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
  var storedSplitterPosition = this.cacheSplitterPosition && sessionStorage.getItem('scout:desktopSplitterPosition');
  if (storedSplitterPosition) {
    // Restore splitter position
    var splitterPosition = parseInt(storedSplitterPosition, 10);
    this.splitter.updatePosition(splitterPosition);
    this._handleUpdateSplitterPosition(splitterPosition);
  } else {
    // Set initial splitter position
    this.splitter.updatePosition();
    this._handleUpdateSplitterPosition(this.splitter.position);
  }
};

//TODO maybe better change to actual properties and set on server?
scout.Desktop.prototype._hasNavigation = function() {
  return this.desktopStyle === scout.DesktopStyle.DEFAULT;
};

scout.Desktop.prototype._hasTaskBar = function() {
  return this.desktopStyle === scout.DesktopStyle.DEFAULT;
};

scout.Desktop.prototype._hasBench = function() {
  return this.benchVisible;
};

scout.Desktop.prototype.onResize = function(event) {
  var selectedViewTab = this.viewTabsController.selectedViewTab();
  if (selectedViewTab) {
    selectedViewTab.onResize();
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
  if (this.cacheSplitterPosition) {
    sessionStorage.setItem('scout:desktopSplitterPosition', splitterPosition);
  }

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
  this.navigation.onResize({
    data: newPosition
  });
  this.onResize({
    data: newPosition
  });
};

scout.Desktop.prototype._attachOutlineContent = function() {
  if (this._outlineContent) {
    this._outlineContent.attach();

  }
};

scout.Desktop.prototype._detachOutlineContent = function() {
  if (this._outlineContent) {
    this._outlineContent.detach();
  }
};

/* communication with outline */

scout.Desktop.prototype.setOutlineContent = function(content, bringToFront) {
  bringToFront = scout.helpers.nvl(bringToFront,true);
  if (this._outlineContent && this._outlineContent !== content) {
    this._outlineContent.remove();
    this._outlineContent = null;
  }

  if (!content) {
    return;
  }

  this._outlineContent = content;
  if (bringToFront) {
    this.viewTabsController.deselectViewTab();
    this._bringNavigationToFront();
  }

  if (!content.rendered) {
    if (content instanceof scout.Table) {
      content.menuBar.top();
      content.menuBar.large();
    }
    content.render(this.$bench);

    // Request focus on first element in new outlineTab.
    this.session.focusManager.validateFocus();

    content.htmlComp.validateLayout();
    content.htmlComp.validateRoot = true;
  }
  else if(!content.attached){
    content.attach();
  }

  //set active form to null because outline is active form.
  this._setOutlineActivated();
  // Request focus on first element in new outlineTab.
  this.session.focusManager.validateFocus(); // TODO [nbu][dwi] why double validate?
};

scout.Desktop.prototype.setOutline = function(outline, bringToFront) {
  this.outline = outline;
  this.navigation.onOutlineChanged(this.outline, bringToFront);
};

scout.Desktop.prototype.setBenchVisible = function(visible) {
  this.benchVisible = visible;
  if (this.rendered) {
    this._renderBenchVisible();
  }
};

scout.Desktop.prototype._onModelFormShow = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    this._setFormActivated(this.session.getOrCreateModelAdapter(event.form, displayParent.formController._displayParent), true);
    //register listener to recover active form when child dialog is removed
    displayParent.formController.registerAndRender(event.form, event.position);
  }
};

scout.Desktop.prototype._onModelFormHide = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.formController.unregisterAndRemove(event.form);
  }
};

scout.Desktop.prototype._onModelFormActivate = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.formController.activateForm(event.form);
    this._setFormActivated(this.session.getOrCreateModelAdapter(event.form, displayParent.formController._displayParent), true);
  }
};

scout.Desktop.prototype._onModelMessageBoxShow = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.messageBoxController.registerAndRender(event.messageBox);
  }
};

scout.Desktop.prototype._onModelMessageBoxHide = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.messageBoxController.unregisterAndRemove(event.messageBox);
  }
};

scout.Desktop.prototype._onModelFileChooserShow = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.fileChooserController.registerAndRender(event.fileChooser);
  }
};

scout.Desktop.prototype._onModelFileChooserHide = function(event) {
  var displayParent = this.session.getModelAdapter(event.displayParent);
  if (displayParent) {
    displayParent.fileChooserController.unregisterAndRemove(event.fileChooser);
  }
};

scout.Desktop.prototype._onModelOpenUri = function(event) {
  $.log.debug('(Desktop#_onModelOpenUri) uri=' + event.uri + ' openUriHint=' + event.openUriHint);
  if (!event.uri) {
    return;
  }

  if (!event.hint && event.uri.match(/^(callto|facetime|fax|geo|mailto|maps|notes|sip|skype|tel):/)) {
    event.hint = 'open-application';
  }

  if (event.hint === 'download') {
    this._openUriInIFrame(event.uri);
  } else if (event.hint === 'open-application') {
    // TODO BSH Does that really work on all platforms?
    this._openUriInIFrame(event.uri);
  } else {
    // 'new-window' -> Open popup
    this._openUriAsNewWindow(event.uri);
  }
};

scout.Desktop.prototype._onModelOutlineChanged = function(event) {
  if (scout.DesktopStyle.DEFAULT === this.desktopStyle) {
    this.setOutline(this.session.getOrCreateModelAdapter(event.outline, this), false);
  }
};

scout.Desktop.prototype._onModelOutlineContentActivate = function(event) {
  if (scout.DesktopStyle.DEFAULT === this.desktopStyle) {
    this.bringOutlineToFront(this.outline);
  }
};

scout.Desktop.prototype.onModelAction = function(event) {
  if (event.type === 'formShow') {
    this._onModelFormShow(event);
  } else if (event.type === 'formHide') {
    this._onModelFormHide(event);
  } else if (event.type === 'formActivate') {
    this._onModelFormActivate(event);
  } else if (event.type === 'messageBoxShow') {
    this._onModelMessageBoxShow(event);
  } else if (event.type === 'messageBoxHide') {
    this._onModelMessageBoxHide(event);
  } else if (event.type === 'fileChooserShow') {
    this._onModelFileChooserShow(event);
  } else if (event.type === 'fileChooserHide') {
    this._onModelFileChooserHide(event);
  } else if (event.type === 'openUri') {
    this._onModelOpenUri(event);
  } else if (event.type === 'outlineChanged') {
    this._onModelOutlineChanged(event);
  } else if (event.type === 'outlineContentActivate') {
    this._onModelOutlineContentActivate(event);
  } else {
    scout.Desktop.parent.prototype.onModelAction.call(this, event);
  }
};

scout.Desktop.prototype._openUriInIFrame = function(uri) {
  // Create a hidden iframe and set the URI as src attribute value
  var $iframe = $('<iframe>')
    .addClass('download-frame')
    .attr('tabindex', -1)
    .appendTo(this.session.$entryPoint)
    .attr('src', uri);

  // Remove the iframe again after 10s (should be enough to get the download started)
  setTimeout(function() {
    $iframe.remove();
  }, 10 * 1000);
};

scout.Desktop.prototype._openUriAsNewWindow = function(uri) {
  var popup;
  if (scout.device.browser === scout.Device.SupportedBrowsers.INTERNET_EXPLORER) {
    // Workaround for IE: When in "protected mode", window.open() returns null for external URLs, even when
    // the popup was successfully opened! To check if a popup blocker is active, we first open an empty
    // popup with no URL, which will return null when the popup was blocked. If the popup was successful,
    // we change the location to the target URI.
    popup = window.open('');
    if (popup) {
      popup.window.location.href = uri;
    }
  } else {
    // Chrome returns undefined, FF null when popup is blocked
    popup = window.open(uri);
  }

  if (!popup) {
    // Popup blocker detected
    var $notification = $.makeDiv('notification');
    var $notificationContent = $notification
      .appendDiv('notification-content notification-closable');
    $.makeDiv('close')
      .on('click', function() {
        this.removeNotification($notification);
      }.bind(this))
      .appendTo($notificationContent);
    $.makeDiv('popup-blocked-title')
      .text(this.session.text('ui.PopupBlockerDetected'))
      .appendTo($notificationContent);
    $('<a href="' + scout.strings.encode(uri) + '" target="_blank">')
      .addClass('popup-blocked-link')
      .text(this.session.text('ui.OpenManually'))
      .on('click', function() {
        this.removeNotification($notification);
      }.bind(this))
      .appendTo($notificationContent);
    this.addNotification($notification);
  }
};

scout.Desktop.prototype.bringOutlineToFront = function(outline) {
  this.viewTabsController.deselectViewTab();

  if (this.outline === outline) {
    if (this.outline.inBackground) {
      this._attachOutlineContent();
      this._bringNavigationToFront();
    }
  } else {
    this.setOutline(outline, true);
  }
  //set active form to null because outline is active form.
  this._setOutlineActivated();

  if (this._hasNavigation()) {
    this.navigation.revalidateLayout();
  }
};

/**
 * Called after width of navigation has been updated.
 */
scout.Desktop.prototype.navigationWidthUpdated = function(navigationWidth) {
  if (this._hasNavigation()) {
    if (this._hasTaskBar()) {
      this._$taskBar.css('left', navigationWidth);
    }
    if (this._hasBench()) {
      this.$bench.css('left', navigationWidth);
    }
  }
};

scout.Desktop.prototype._bringNavigationToFront = function() {
  this.navigation.bringToFront();
  this._renderBenchDropShadow(false);
};

scout.Desktop.prototype._sendNavigationToBack = function() {
  this.navigation.sendToBack();
  this._renderBenchDropShadow(true);
};

scout.Desktop.prototype._renderBenchDropShadow = function(showShadow) {
  if (this._hasNavigation() && this._hasBench()) {
    this.$bench.toggleClass('drop-shadow', showShadow);
  }
};

/**
 * === Method required for objects that act as 'displayParent' ===
 *
 * Returns the DOM elements to paint a glassPanes over, once a modal Form, message-box, file-chooser or wait-dialog is showed with the Desktop as its 'displayParent'.
 */
scout.Desktop.prototype.glassPaneTargets = function() {
  // Do not return $container, because this is the parent of all forms and message boxes. Otherwise, no form could gain focus, even the form requested desktop modality.
  return $.makeArray(this.$container
    .children()
    .not('.splitter') // exclude splitter to be locked
    .not('.notifications')); // exclude notification box like 'connection interrupted' to be locked
};

/**
 * === Method required for objects that act as 'displayParent' ===
 *
 * Returns 'true' if the Desktop is currently accessible to the user.
 */
scout.Desktop.prototype.inFront = function() {
  return true; // Desktop is always available to the user.
};

/**
 * Creates a local "null-outline" and an OutlineViewButton which is used, when no outline is available.
 * This avoids a lot of if/else code. The OVB adds a property 'visibleInMenu' which is only used in
 * the UI to decide whether or not the OVB will be shown in the ViewMenuPopup.js.
 */
scout.Desktop.prototype._addNullOutline = function(outline) {
  if (outline) {
    return;
  }
  var nullOutline = scout.create('Outline', {
    parent: this
  }),
    ovb = scout.create('OutlineViewButton', {
      parent: this,
      displayStyle: 'MENU',
      selected: true,
      text: this.session.text('ui.Outlines'),
      desktop: this,
      visibleInMenu: false
    });

  ovb.outline = nullOutline;
  this.outline = nullOutline;
  this.viewButtons.push(ovb);
};

scout.Desktop.prototype._setOutlineActivated = function() {
  this._setFormActivated();
};

scout.Desktop.prototype._setFormActivated = function(form, suppressSend) {

  //if desktop is in rendering process the can not set a new active for. instead the active form from the model is set selected.
  if (!this.rendered || this.suppressSetActiveForm) {
    return;
  }

  if ((form && this.activeForm !== form.id) || (!form && this.activeForm)) {
    this.activeForm = form ? form.id : null;
    if (!suppressSend) {
      this._sendFormActivated(form);
    }
  }
};

scout.Desktop.prototype._sendFormActivated = function(form) {
  var data = {
    formId: null
  };
  if (form) {
    data.formId = form.id;
  }

  var event = new scout.Event(this.id, 'formActivated', data);
  event.coalesce = function(previous) {
    return this.type === previous.type;
  };

  this.session.sendEvent(event);
};
