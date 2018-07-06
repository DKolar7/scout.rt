/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.Widget = function() {
  this.session = null;

  /**
   * The owner is responsible that its children are destroyed when the owner is being destroyed.
   */
  this.owner = null;
  /**
   * The parent is typically the same as the owner.
   * But the widget may be used by another widget (like a popup), in that case the parent will be changed to the popup but the owner stays the same.
   * This means the popup is now the temporary parent, when the popup is destroyed its widgets are not because the popup is not the owner.
   * Example: ViewMenuPopup uses the ViewButtons as menu items. These view buttons are owned by the desktop and must therefore not be destroyed
   * when the popup closes, otherwise they could not be reused the second time the popup opens.
   */
  this.parent = null;
  this.children = [];
  this.initialized = false;

  /**
   * The 'rendering' flag is set the true while the _inital_ rendering is performed.
   * It is used to to something different in a _render* method when the method is
   * called for the first time.
   */
  this.rendering = false;
  this.removing = false;
  this.removalPending = false;

  /**
   * The 'rendered' flag is set the true when initial rendering of the widget is completed.
   */
  this.rendered = false;
  this.attached = false;
  this.destroyed = false;
  this.destroying = false;

  this.enabled = true;
  /**
   * The computed enabled state. The difference to the 'enabled' property is that this member
   * also considers the enabled-states of the parent widgets.
   */
  this.enabledComputed = true;
  this.inheritAccessibility = true;
  this.disabledStyle = scout.Widget.DisabledStyle.DEFAULT;
  this.visible = true;
  this.focused = false;
  this.loading = false;
  this.cssClass = null;

  this.$container;
  // If set to true, remove won't remove the element immediately but after the animation has been finished
  // This expects a css animation which may be triggered by the class 'animate-remove'
  // If browser does not support css animation, remove will be executed immediately
  this.animateRemoval = false;

  this._widgetProperties = [];
  this._cloneProperties = ['visible', 'enabled', 'inheritAccessibility', 'cssClass'];
  this.eventDelegators = [];
  this._preserveOnPropertyChangeProperties = [];
  this._postRenderActions = [];
  this._parentDestroyHandler = this._onParentDestroy.bind(this);
  this.events = this._createEventSupport();
  this.loadingSupport = this._createLoadingSupport();
  this.keyStrokeContext = this._createKeyStrokeContext();
  // Widgets using scout.LogicalGridLayout may have a grid to calculate the grid data of the children
  this.logicalGrid;
};

/**
 * Enum used to define different styles used when the field is disabled.
 */
scout.Widget.DisabledStyle = {
  DEFAULT: 0,
  READ_ONLY: 1
};

scout.Widget.prototype.init = function(model) {
  var staticModel = this._jsonModel();
  if (staticModel) {
    model = $.extend({}, staticModel, model);
  }
  this._init(model);
  this._initKeyStrokeContext();
  this.initialized = true;
  this.trigger('init');
};

/**
 * @param options
 * - parent (required): The parent widget
 * - session (optional): If not specified the session of the parent is used
 */
scout.Widget.prototype._init = function(model) {
  model = model || {};
  if (!model.parent) {
    throw new Error('Parent expected: ' + this);
  }
  this.setOwner(model.owner || model.parent);
  this.setParent(model.parent);

  this.session = model.session || this.parent.session;
  if (!this.session) {
    throw new Error('Session expected: ' + this);
  }

  this._eachProperty(model, function(propertyName, value, isWidgetProperty) {
    if (value === undefined) {
      // Don't set the value if it is undefined, compared to null which is allowed explicitly ($.extend works in the same way)
      return;
    }
    if (isWidgetProperty) {
      value = this._prepareWidgetProperty(propertyName, value);
    }
    this._initProperty(propertyName, value);
  }.bind(this));

  this._setCssClass(this.cssClass);
  this._setLogicalGrid(this.logicalGrid);
  this._setEnabled(this.enabled);
};

/**
 * This function sets the property value. Override this function when you need special init behavior for certain properties.
 * For instance you could not simply set the property value, but extend an already existing value.
 */
scout.Widget.prototype._initProperty = function(propertyName, value) {
  this[propertyName] = value;
};

/**
 * Default implementation simply returns undefined. A Subclass
 * may override this method to load or extend a JSON model with scout.models.getModel or scout.models.extend.
 */
scout.Widget.prototype._jsonModel = function() {};

/**
 * Creates the widgets using the given models, or returns the widgets if the given models already are widgets.
 * @returns an array of created widgets if models was an array. Or the created widget if models is not an array.
 */
scout.Widget.prototype._createChildren = function(models) {
  if (!models) {
    return null;
  }

  if (!Array.isArray(models)) {
    return this._createChild(models);
  }

  var widgets = [];
  models.forEach(function(model, i) {
    widgets[i] = this._createChild(model);
  }, this);
  return widgets;
};

/**
 * Calls {@link scout.create} for the given model, or if model is already a scout.Widget simply returns the widget.
 *
 * @param model {Object|scout.Widget}
 * @returns {scout.Widget}
 */
scout.Widget.prototype._createChild = function(model) {
  if (model instanceof scout.Widget) {
    return model;
  }
  if (typeof model === 'string') {
    // Special case: If only an ID is supplied, try to (locally) resolve the corresponding widget
    var existingWidget = this.widget(model);
    if (!existingWidget) {
      throw new Error('Referenced widget not found: ' + model);
    }
    return existingWidget;
  }
  model.parent = this;
  return scout.create(model);
};

scout.Widget.prototype._initKeyStrokeContext = function() {
  if (!this.keyStrokeContext) {
    return;
  }
  this.keyStrokeContext.$scopeTarget = function() {
    return this.$container;
  }.bind(this);
  this.keyStrokeContext.$bindTarget = function() {
    return this.$container;
  }.bind(this);
};

scout.Widget.prototype.destroy = function() {
  if (this.destroyed) {
    // Already destroyed, do nothing
    return;
  }
  this.destroying = true;
  if (this.rendered && (this.animateRemoval || this._isRemovalPrevented())) {
    // Do not destroy yet if the removal happens animated
    // Also don't destroy if the removal is pending to keep the parent / child link until removal finishes
    this.one('remove', function() {
      this.destroy();
    }.bind(this));
    this.remove();
    return;
  }

  // Destroy children in reverse order
  this._destroyChildren(this.children.slice().reverse());
  this.remove();
  this._destroy();

  // Disconnect from owner and parent
  this.owner._removeChild(this);
  this.owner = null;
  this.parent._removeChild(this);
  this.parent.off('destroy', this._parentDestroyHandler);
  this.parent = null;

  this.destroying = false;
  this.destroyed = true;
  this.trigger('destroy');
};

/**
 * Override this function to do clean-up (like removing listeners) when the widget is destroyed.
 * The default impl. does nothing.
 */
scout.Widget.prototype._destroy = function() {
  // NOP
};

/**
 * @param widgets may be an object or array of objects
 */
scout.Widget.prototype._destroyChildren = function(widgets) {
  if (!widgets) {
    return;
  }

  widgets = scout.arrays.ensure(widgets);
  widgets.forEach(function(widget, i) {
    this._destroyChild(widget);
  }, this);
};

scout.Widget.prototype._destroyChild = function(child) {
  if (child.owner !== this) {
    return;
  }
  child.destroy();
};

/**
 * @param [$parent] The jQuery element which is used as $parent when rendering this widget.
 * It will be put onto the widget and is therefore accessible as this.$parent in the _render method.
 * If not specified, the $container of the parent is used.
 */
scout.Widget.prototype.render = function($parent) {
  $.log.isTraceEnabled() && $.log.trace('Rendering widget: ' + this);
  if (!this.initialized) {
    throw new Error('Not initialized: ' + this);
  }
  if (this.rendered) {
    throw new Error('Already rendered: ' + this);
  }
  if (this.destroyed) {
    throw new Error('Widget is destroyed: ' + this);
  }
  this.rendering = true;
  this.$parent = $parent || this.parent.$container;
  this._render();
  this._renderProperties();
  this._renderInspectorInfo();
  this._linkWithDOM();
  this.session.keyStrokeManager.installKeyStrokeContext(this.keyStrokeContext);
  this.rendering = false;
  this.rendered = true;
  this.attached = true;
  this.trigger('render');
  this._postRender();
};

/**
 * This method creates the UI through DOM manipulation. At this point we should not apply model
 * properties on the UI, since sub-classes may need to contribute to the DOM first. You must not
 * apply model values to the UI here, since this is done in the _renderProperties method later.
 * The default impl. does nothing.
 */
scout.Widget.prototype._render = function() {
  // NOP
};

/**
 * This method calls the UI setter methods after the _render method has been executed.
 * Here values of the model are applied to the DOM / UI.
 */
scout.Widget.prototype._renderProperties = function() {
  this._renderEnabled();
  this._renderVisible();
  this._renderFocused();
  this._renderCssClass();
  this._renderLoading();
};

/**
 * Method invoked once rendering completed and 'rendered' flag is set to 'true'.<p>
 * By default executes every action of this._postRenderActions
 */
scout.Widget.prototype._postRender = function() {
  var actions = this._postRenderActions;
  this._postRenderActions = [];
  actions.forEach(function(action) {
    action();
  });
};

scout.Widget.prototype.remove = function() {
  if (!this.rendered || this._isRemovalPrevented()) {
    return;
  }
  if (this.animateRemoval) {
    this._removeAnimated();
  } else {
    this._removeInternal();
  }
};

/**
 * Will be called by {@link #remove()}. If true is returned, the widget won't be removed.<p>
 * By default it just delegates to {@link #_isRemovalPending}. May be overridden to customize it.
 */
scout.Widget.prototype._isRemovalPrevented = function() {
  return this._isRemovalPending();
};

/**
 * Returns true if the removal of this or an ancestor widget is pending. Checking the ancestor is omitted if the parent is being removed.
 * This may be used to prevent a removal if an ancestor will be removed (e.g by an animation)
 */
scout.Widget.prototype._isRemovalPending = function() {
  if (this.removalPending) {
    return true;
  }
  var parent = this.parent;
  if (!parent || parent.removing) {
    // If parent is being removed, no need to check the ancestors because removing is already in progress
    return false;
  }
  while (parent) {
    if (parent.removalPending) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
};

scout.Widget.prototype._removeInternal = function() {
  if (!this.rendered) {
    return;
  }

  $.log.isTraceEnabled() && $.log.trace('Removing widget: ' + this);
  this.removing = true;
  this.removalPending = false;
  this.trigger('removing');

  // remove children in reverse order.
  this.children.slice().reverse().forEach(function(child) {
    // Only remove the child if this widget is the current parent (if that is not the case this widget is the owner)
    if (child.parent === this) {
      child.remove();
    }
  }, this);
  this.session.keyStrokeManager.uninstallKeyStrokeContext(this.keyStrokeContext);
  if (this.loadingSupport) {
    this.loadingSupport.remove();
  }
  this._cleanup();
  this._remove();
  this.$parent = null;
  this.rendered = false;
  this.attached = false;
  this.removing = false;
  this.trigger('remove');
};

/**
 * Adds class 'animate-remove' to container which can be used to trigger the animation.
 * After the animation is executed, the element gets removed using this._removeInternal.
 */
scout.Widget.prototype._removeAnimated = function() {
  if (!scout.device.supportsCssAnimation() || !this.$container || this.$container.isDisplayNone()) {
    // Cannot remove animated, remove regularly
    this._removeInternal();
    return;
  }

  // Destroy open popups first, they are not animated
  this.session.desktop.destroyPopupsFor(this);

  this.removalPending = true;
  // Don't execute immediately to make sure nothing interferes with the animation (e.g. layouting) which could make it laggy
  setTimeout(function() {
    // check if the container has been removed in the meantime
    if (!this.rendered) {
      return;
    }
    this.$container.addClass('animate-remove');
    this.$container.oneAnimationEnd(function() {
      this._removeInternal();
    }.bind(this));
  }.bind(this));

  // If the parent is being removed while the animation is running, the animationEnd event will never fire
  // -> Make sure remove is called nevertheless. Important: remove it before the parent is removed to maintain the regular remove order
  this.parent.one('removing', function() {
    this._removeInternal();
  }.bind(this));
};

scout.Widget.prototype._renderInspectorInfo = function() {
  if (!this.session.inspector) {
    return;
  }
  scout.inspector.applyInfo(this);
};

/**
 * Links $container with the widget.
 */
scout.Widget.prototype._linkWithDOM = function() {
  if (this.$container) {
    this.$container.data('widget', this);
  }
};

/**
 * Called right before _remove is called.
 * Default calls LayoutValidator.cleanupInvalidComponents to make sure that child components are removed from the invalid components list.
 */
scout.Widget.prototype._cleanup = function() {
  if (this.$container) {
    this.session.layoutValidator.cleanupInvalidComponents(this.$container);
  }
};

scout.Widget.prototype._remove = function() {
  if (this.$container) {
    this.$container.remove();
    this.$container = null;
  }
};

scout.Widget.prototype.setOwner = function(owner) {
  scout.assertParameter('owner', owner);
  if (owner === this.owner) {
    return;
  }

  if (this.owner) {
    // Remove from old owner
    this.owner._removeChild(this);
  }
  this.owner = owner;
  this.owner._addChild(this);
};

scout.Widget.prototype.setParent = function(parent) {
  scout.assertParameter('parent', parent);
  if (parent === this.parent) {
    return;
  }

  if (this.parent) {
    // Don't link to new parent yet if removal is still pending.
    // After the animation the parent will remove its children.
    // If they are already linked to a new parent, removing the children is not possible anymore.
    // This may lead to an "Already rendered" exception if the new parent wants to render its children.
    if (this.parent._isRemovalPending()) {
      this.parent.one('remove', function() {
        this.setParent(parent);
      }.bind(this));
      return;
    }

    this.parent.off('destroy', this._parentDestroyHandler);

    if (this.parent !== this.owner) {
      // Remove from old parent if getting relinked
      // If the old parent is still the owner, don't remove it because owner stays responsible for destroying it
      this.parent._removeChild(this);
    }
  }
  this.parent = parent;
  this.parent._addChild(this);
  if (this.initialized) {
    this.recomputeEnabled(this.parent.enabledComputed);
  }
  this.parent.one('destroy', this._parentDestroyHandler);
};

scout.Widget.prototype._addChild = function(child) {
  $.log.isTraceEnabled() && $.log.trace('addChild(' + child + ') to ' + this);
  if (this.children.indexOf(child) === -1) {
    this.children.push(child);
  }
};

scout.Widget.prototype._removeChild = function(child) {
  $.log.isTraceEnabled() && $.log.trace('removeChild(' + child + ') from ' + this);
  scout.arrays.remove(this.children, child);
};

/**
 * @returns a list of all ancestors
 */
scout.Widget.prototype.ancestors = function() {
  var ancestors = [];
  var parent = this.parent;
  while (parent) {
    ancestors.push(parent);
    parent = parent.parent;
  }
  return ancestors;
};

/**
 * @returns true if the given widget is the same as this or a descendant
 */
scout.Widget.prototype.isOrHas = function(widget) {
  if (widget === this) {
    return true;
  }
  return this.has(widget);
};

/**
 * @returns true if the given widget is a descendant
 */
scout.Widget.prototype.has = function(widget) {
  while (widget) {
    if (widget.parent === this) {
      return true;
    }
    widget = widget.parent;
  }

  return false;
};

/**
 * @returns {scout.Form} the form the widget belongs to (returns the first parent which is a {@link scout.Form}.
 */
scout.Widget.prototype.getForm = function() {
  return scout.Form.findForm(this);
};

/**
 * @returns the first form which is not an inner form of a wrapped form field
 */
scout.Widget.prototype.findNonWrappedForm = function() {
  return scout.Form.findNonWrappedForm(this);
};

/**
 * Changes the enabled property of this form field to the given value.
 *
 * @param enabled
 *          Required. The new enabled value
 * @param updateParents
 *          (optional) If true, the enabled property of all parent form fields are
 *          updated to same value as well. Default is false.
 * @param updateChildren
 *          (optional) If true the enabled property of all child form fields (recursive)
 *          are updated to same value as well. Default is false.
 */
scout.Widget.prototype.setEnabled = function(enabled, updateParents, updateChildren) {
  this.setProperty('enabled', enabled);

  if (enabled && updateParents && this.parent) {
    this.parent.setEnabled(true, true, false);
  }

  if (updateChildren) {
    this.visitChildren(function(field) {
      field.setEnabled(enabled);
    });
  }
};

scout.Widget.prototype._setEnabled = function(enabled) {
  this._setProperty('enabled', enabled);
  this.recomputeEnabled();
};

scout.Widget.prototype.recomputeEnabled = function(parentEnabled) {
  if (parentEnabled === undefined) {
    parentEnabled = true;
    if (this.parent && this.parent.initialized && this.parent.enabledComputed !== undefined) {
      parentEnabled = this.parent.enabledComputed;
    }
  }

  var enabledComputed = this._computeEnabled(this.inheritAccessibility, parentEnabled);
  this.setProperty('enabledComputed', enabledComputed);

  // Manually call _renderEnabled(), because _renderEnabledComputed() does not exist
  if (this.rendered) {
    this._renderEnabled(); // refresh
  }

  this.children.forEach(function(child) {
    child.recomputeEnabled(enabledComputed);
  });
};

scout.Widget.prototype._computeEnabled = function(inheritAccessibility, parentEnabled) {
  return this.enabled && (inheritAccessibility ? parentEnabled : true);
};

scout.Widget.prototype._renderEnabled = function() {
  if (!this.$container) {
    return;
  }
  this.$container.setEnabled(this.enabledComputed);
  this._renderDisabledStyle();
};

scout.Widget.prototype.setInheritAccessibility = function(inheritAccessibility) {
  this.setProperty('inheritAccessibility', inheritAccessibility);
};

scout.Widget.prototype._setInheritAccessibility = function(inheritAccessibility) {
  this._setProperty('inheritAccessibility', inheritAccessibility);
  this.recomputeEnabled();
};

scout.Widget.prototype.setDisabledStyle = function(disabledStyle) {
  this.setProperty('disabledStyle', disabledStyle);

  this.children.forEach(function(child) {
    child.setDisabledStyle(disabledStyle);
  });
};

scout.Widget.prototype._renderDisabledStyle = function() {
  this._renderDisabledStyleInternal(this.$container);
};

/**
 * This function is used by subclasses to render the read-only class for a given $field.
 * Some fields like DateField have two input fields and thus cannot use the this.$field property.
 */
scout.Widget.prototype._renderDisabledStyleInternal = function($element) {
  if (!$element) {
    return;
  }
  if (this.enabledComputed) {
    $element.removeClass('read-only');
  } else {
    $element.toggleClass('read-only', this.disabledStyle === scout.Widget.DisabledStyle.READ_ONLY);
  }
};

scout.Widget.prototype.setVisible = function(visible) {
  this.setProperty('visible', visible);
};

/**
 * @returns whether the widget is visible or not. May depend on other conditions than the visible property only
 */
scout.Widget.prototype.isVisible = function() {
  return this.visible;
};

scout.Widget.prototype._renderVisible = function() {
  if (!this.$container) {
    return;
  }
  this.$container.setVisible(this.isVisible());
  this.invalidateParentLogicalGrid();
};

/**
 * This function does not set the focus to the field. It toggles the 'focused' class on the field container if present.
 * Objects using widget as prototype must call this function onBlur and onFocus to ensure the class gets toggled.
 *
 *  Use scout.Widget.focus to set the focus to the widget.
 */
scout.Widget.prototype.setFocused = function(focused) {
  this.setProperty('focused', focused);
};

scout.Widget.prototype._renderFocused = function() {
  if (this.$container) {
    this.$container.toggleClass('focused', this.focused);
  }
};

scout.Widget.prototype._setCssClass = function(cssClass) {
  if (this.rendered) {
    this._removeCssClass();
  }
  this._setProperty('cssClass', cssClass);
};

scout.Widget.prototype._removeCssClass = function() {
  if (!this.$container) {
    return;
  }
  this.$container.removeClass(this.cssClass);
};

scout.Widget.prototype._renderCssClass = function() {
  if (!this.$container) {
    return;
  }
  this.$container.addClass(this.cssClass);
};

scout.Widget.prototype.setCssClass = function(cssClass) {
  this.setProperty('cssClass', cssClass);
};

scout.Widget.prototype.addCssClass = function(cssClass) {
  var cssClasses = this.cssClassAsArray();
  var cssClassesToAdd = scout.Widget.cssClassAsArray(cssClass);
  cssClassesToAdd.forEach(function(newCssClass) {
    if (cssClasses.indexOf(newCssClass) >= 0) {
      return;
    }
    cssClasses.push(newCssClass);
  }, this);
  this.setProperty('cssClass', scout.arrays.format(cssClasses, ' '));
};

scout.Widget.prototype.removeCssClass = function(cssClass) {
  var cssClasses = this.cssClassAsArray();
  var cssClassesToRemove = scout.Widget.cssClassAsArray(cssClass);
  if (scout.arrays.removeAll(cssClasses, cssClassesToRemove)) {
    this.setProperty('cssClass', scout.arrays.format(cssClasses, ' '));
  }
};

scout.Widget.prototype.toggleCssClass = function(cssClass, condition) {
  if (condition) {
    this.addCssClass(cssClass);
  } else {
    this.removeCssClass(cssClass);
  }
};

scout.Widget.prototype.cssClassAsArray = function() {
  return scout.Widget.cssClassAsArray(this.cssClass);
};

/**
 * Creates nothing by default. If a widget needs loading support, override this method and return a loading support.
 */
scout.Widget.prototype._createLoadingSupport = function() {
  return null;
};

scout.Widget.prototype.setLoading = function(loading) {
  this.setProperty('loading', loading);
};

scout.Widget.prototype.isLoading = function() {
  return this.loading;
};

scout.Widget.prototype._renderLoading = function() {
  if (!this.loadingSupport) {
    return;
  }
  this.loadingSupport.renderLoading();
};

//--- Layouting / HtmlComponent methods ---

scout.Widget.prototype.pack = function() {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.pack();
};

scout.Widget.prototype.invalidateLayout = function() {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.invalidateLayout();
};

scout.Widget.prototype.validateLayout = function() {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.validateLayout();
};

scout.Widget.prototype.revalidateLayout = function() {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.revalidateLayout();
};

/**
 * @param [invalidateParents] optional, default is true
 */
scout.Widget.prototype.invalidateLayoutTree = function(invalidateParents) {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.invalidateLayoutTree(invalidateParents);
};

scout.Widget.prototype.validateLayoutTree = function() {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.validateLayoutTree();
};

scout.Widget.prototype.revalidateLayoutTree = function(invalidateParents) {
  if (!this.rendered || this.removing) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.revalidateLayoutTree(invalidateParents);
};

/**
 * The layout data contains hints for the layout of the parent container to layout this individual child widget inside the container.<br>
 * Note: this is not the same as the LayoutConfig. The LayoutConfig contains constraints for the layout itself and is therefore set on the parent container directly.
 * <p>
 * Example: The parent container uses a LogicalGridLayout to layout its children. Every child has a LogicalGridLayoutData to tell the layout how this specific child should be layouted.
 * The parent may have a LogicalGridLayoutConfig to specify constraints which affect either only the container or every child in the container.
 */
scout.Widget.prototype.setLayoutData = function(layoutData) {
  if (!this.rendered) {
    return;
  }
  if (!this.htmlComp) {
    throw new Error('Function expects a htmlComp property');
  }
  this.htmlComp.layoutData = layoutData;
};

/**
 * If the widget uses a logical grid layout, the grid may be validated using this method.
 * <p>
 * If the grid is not dirty, nothing happens.
 */
scout.Widget.prototype.validateLogicalGrid = function() {
  if (this.logicalGrid) {
    this.logicalGrid.validate(this);
  }
};

/**
 * Marks the logical grid as dirty.<br>
 * Does nothing, if there is no logical grid.
 * @param {boolean} [invalidateLayout] true, to invalidate the layout afterwards, false if not. Default is true.
 */
scout.Widget.prototype.invalidateLogicalGrid = function(invalidateLayout) {
  if (!this.initialized) {
    return;
  }
  if (!this.logicalGrid) {
    return;
  }
  this.logicalGrid.setDirty(true);
  if (scout.nvl(invalidateLayout, true)) {
    this.invalidateLayoutTree();
  }
};

/**
 * Invalidates the logical grid of the parent widget. Typically done when the visibility of the widget changes.
 * @param {boolean} [invalidateLayout] true, to invalidate the layout of the parent of this.htmlComp, false if not. Default is true.
 */
scout.Widget.prototype.invalidateParentLogicalGrid = function(invalidateLayout) {
  if (!this.rendered || !this.htmlComp) {
    return;
  }
  this.parent.invalidateLogicalGrid(false);
  if (scout.nvl(invalidateLayout, true)) {
    var htmlCompParent = this.htmlComp.getParent();
    if (htmlCompParent) {
      htmlCompParent.invalidateLayoutTree();
    }
  }
};

scout.Widget.prototype.revalidateLogicalGrid = function(invalidateLayout) {
  this.invalidateLogicalGrid(invalidateLayout);
  this.validateLogicalGrid();
};

scout.Widget.prototype.setLogicalGrid = function(logicalGrid) {
  this.setProperty('logicalGrid', logicalGrid);
};

/**
 * @param logicalGrid an instance of {@link scout.LogicalGrid} or a string representing the object type of a logical grid.
 */
scout.Widget.prototype._setLogicalGrid = function(logicalGrid) {
  if (typeof logicalGrid === 'string') {
    logicalGrid = scout.create(logicalGrid);
  }
  this._setProperty('logicalGrid', logicalGrid);
  this.invalidateLogicalGrid();
};

//--- Event handling methods ---
scout.Widget.prototype._createEventSupport = function() {
  return new scout.EventSupport();
};

scout.Widget.prototype.trigger = function(type, event) {
  event = event || {};
  event.source = this;
  this.events.trigger(type, event);
};

scout.Widget.prototype.one = function(type, func) {
  this.events.one(type, func);
};

scout.Widget.prototype.on = function(type, func) {
  return this.events.on(type, func);
};

scout.Widget.prototype.off = function(type, func) {
  this.events.off(type, func);
};

scout.Widget.prototype.addListener = function(listener) {
  this.events.addListener(listener);
};

scout.Widget.prototype.removeListener = function(listener) {
  this.events.removeListener(listener);
};

/**
 * Adds an event handler using {@link #one()} and returns a promise.
 * The promise is resolved as soon as the event is triggered.
 */
scout.Widget.prototype.when = function(type) {
  return this.events.when(type);
};

/**
 * @param $element (optional) element from which the entryPoint will be resolved. If not set this.parent.$container is used.
 * @returns the entry-point for this Widget. If the widget is part of the main-window it returns this.session.$entryPoint,
 * for popup-window this function will return the body of the document in the popup window.
 */
scout.Widget.prototype.entryPoint = function($element) {
  $element = scout.nvl($element, this.parent.$container);
  if (!$element.length) {
    throw new Error('Cannot resolve entryPoint, $element.length is 0 or undefined');
  }
  return $element.entryPoint();
};

scout.Widget.prototype.window = function(domElement) {
  var $el = this.$container || this.$parent;
  return $el ? $el.window(domElement) : (domElement ? null : $(null));
};

scout.Widget.prototype.document = function(domElement) {
  var $el = this.$container || this.$parent;
  return $el ? $el.document(domElement) : (domElement ? null : $(null));
};

/**
 * This method attaches the detached $container to the DOM.
 */
scout.Widget.prototype.attach = function() {
  if (this.attached || !this.rendered) {
    return;
  }
  this._attach();
  this._afterAttach();
  this._triggerChildrenAfterAttach(this);
};

scout.Widget.prototype._triggerChildrenAfterAttach = function(parent) {
  this.children.forEach(function(child) {
    child._afterAttach();
    child._triggerChildrenAfterAttach(parent);
  });
};

scout.Widget.prototype._afterAttach = function() {
  // NOP
};

/**
 * Override this method to do something when Widget is attached again. Typically
 * you will append this.$container to this.$parent. The default implementation
 * sets this.attached to true.
 *
 * @param the event.target property is used to decide if a Widget must attach
 *   its $container. When the parent of the Widget already attaches, the Widget
 *   itself must _not_ attach its own $container. That's why we should only
 *   attach when event.target is === this.
 */
scout.Widget.prototype._attach = function(event) {
  this.attached = true;
};

/**
 * This method calls detach() on all child-widgets. It is used to store some data
 * before a DOM element is detached and propagate the detach "event" to all child-
 * widgets, because when a DOM element is detached - child elements are not notified
 */
scout.Widget.prototype.detach = function() {
  if (this.rendering) {
    // Defer the execution of detach. If it was detached while rendering the attached flag would be wrong.
    this._postRenderActions.push(this.detach.bind(this));
  }
  if (!this.attached || !this.rendered || this._isRemovalPending()) {
    return;
  }

  this._triggerChildrenBeforeDetach(this);
  this._beforeDetach();
  this._detach();
};

/**
 * Override this method to do something when Widget is detached. Typically you
 * will call this.$container.detach() here and use the DetachHelper to store
 * additional state (focus, scrollbars) for the detached element. The default
 * implementation sets this.attached to false.
 */
scout.Widget.prototype._detach = function() {
  this.attached = false;
};

scout.Widget.prototype._triggerChildrenBeforeDetach = function() {
  this.children.forEach(function(child) {
    child._beforeDetach();
    child._triggerChildrenBeforeDetach(parent);
  });
};

scout.Widget.prototype._beforeDetach = function(parent) {
  // NOP
};

/**
 * Does nothing by default. If a widget needs keystroke support override this method and return a keystroke context, e.g. the default scout.KeyStrokeContext.
 */
scout.Widget.prototype._createKeyStrokeContext = function() {
  return null;
};

scout.Widget.prototype.updateKeyStrokes = function(newKeyStrokes, oldKeyStrokes) {
  this.unregisterKeyStrokes(oldKeyStrokes);
  this.registerKeyStrokes(newKeyStrokes);
};

scout.Widget.prototype.registerKeyStrokes = function(keyStrokes) {
  this.keyStrokeContext.registerKeyStrokes(keyStrokes);
};

scout.Widget.prototype.unregisterKeyStrokes = function(keyStrokes) {
  this.keyStrokeContext.unregisterKeyStrokes(keyStrokes);
};

/**
 * Triggers a property change for a single property. The event is only triggered when
 * old and new value are the same.
 */
scout.Widget.prototype.triggerPropertyChange = function(propertyName, oldValue, newValue) {
  scout.assertParameter('propertyName', propertyName);
  var event = new scout.Event({
    propertyName: propertyName,
    oldValue: oldValue,
    newValue: newValue
  });
  this.trigger('propertyChange', event);
  return event;
};

/**
 * Sets the value of the property 'propertyName' to 'newValue' and then fires a propertyChange event for that property.
 */
scout.Widget.prototype._setProperty = function(propertyName, newValue) {
  scout.assertParameter('propertyName', propertyName);
  var oldValue = this[propertyName];
  if (scout.objects.equals(oldValue, newValue)) {
    return;
  }
  this[propertyName] = newValue;
  var event = this.triggerPropertyChange(propertyName, oldValue, newValue);
  if (event.defaultPrevented) {
    // Revert to old value if property change should be prevented
    this[propertyName] = oldValue;
  }
};

/**
 * Sets a new value for a specific property. If the new value is the same value as the old one, nothing is performed.
 * Otherwise the following phases are executed:
 * <p>
 * 1. Preparation: If the property is a widget property, several actions are performed in _prepareWidgetProperty().
 * 2. DOM removal: If the property is a widget property and the widget is rendered, the changed widget(s) are removed unless the property should not be preserved (see _preserveOnPropertyChangeProperties).
 *    If there is a custom remove function (e.g. _removeXY where XY is the property name), it will be called instead of removing the widgets directly.
 * 3. Model update: If there is a custom set function (e.g. _setXY where XY is the property name), it will be called. Otherwise the default set function _setProperty is called.
 * 4. DOM rendering: If the widget is rendered and there is a custom render function (e.g. _renderXY where XY is the property name), it will be called. Otherwise nothing happens.
 */
scout.Widget.prototype.setProperty = function(propertyName, value) {
  if (scout.objects.equals(this[propertyName], value)) {
    return;
  }

  value = this._prepareProperty(propertyName, value);
  if (this.rendered) {
    this._callRemoveProperty(propertyName);
  }
  this._callSetProperty(propertyName, value);
  if (this.rendered) {
    this._callRenderProperty(propertyName);
  }
};

scout.Widget.prototype._prepareProperty = function(propertyName, value) {
  if (!this.isWidgetProperty(propertyName)) {
    return value;
  }
  return this._prepareWidgetProperty(propertyName, value);
};

scout.Widget.prototype._prepareWidgetProperty = function(propertyName, widgets) {
  // Create new child widget(s)
  widgets = this._createChildren(widgets);

  var oldWidgets = this[propertyName];
  if (oldWidgets && Array.isArray(widgets)) {
    // If new value is an array, old value has to be one as well
    // Only destroy those which are not in the new array
    oldWidgets = scout.arrays.diff(oldWidgets, widgets);
  }

  // Destroy old child widget(s)
  if (!this.isPreserveOnPropertyChangeProperty(propertyName)) {
    this._destroyChildren(oldWidgets);
  }

  // Link to new parent
  this.link(widgets);

  return widgets;
};

/**
 * Does nothing if the property is not a widget property.<p>
 * If it is a widget property, it removes the existing widgets. Render has to be implemented by the widget itself.
 */
scout.Widget.prototype._callRemoveProperty = function(propertyName) {
  if (!this.isWidgetProperty(propertyName)) {
    return;
  }
  if (this.isPreserveOnPropertyChangeProperty(propertyName)) {
    return;
  }
  var widgets = this[propertyName];
  if (!widgets) {
    return;
  }
  var removeFuncName = '_remove' + scout.strings.toUpperCaseFirstLetter(propertyName);
  if (this[removeFuncName]) {
    this[removeFuncName]();
  } else {
    this._internalRemoveWidgets(widgets);
  }
};

/**
 * Removes the given widgets
 */
scout.Widget.prototype._internalRemoveWidgets = function(widgets) {
  widgets = scout.arrays.ensure(widgets);
  widgets.forEach(function(widget) {
    widget.remove();
  });
};

scout.Widget.prototype._callSetProperty = function(propertyName, value) {
  var setFuncName = '_set' + scout.strings.toUpperCaseFirstLetter(propertyName);
  if (this[setFuncName]) {
    this[setFuncName](value);
  } else {
    this._setProperty(propertyName, value);
  }
};

scout.Widget.prototype._callRenderProperty = function(propertyName) {
  var renderFuncName = '_render' + scout.strings.toUpperCaseFirstLetter(propertyName);
  if (!this[renderFuncName]) {
    return;
  }
  this[renderFuncName]();
};

/**
 * Sets this widget as parent of the given widget(s).
 *
 * @param widgets may be a widget or array of widgets
 */
scout.Widget.prototype.link = function(widgets) {
  if (!widgets) {
    return;
  }

  widgets = scout.arrays.ensure(widgets);
  widgets.forEach(function(child, i) {
    child.setParent(this);
  }, this);
};

/**
 * Method required for widgets which are supposed to be directly covered by a glasspane.<p>
 *
 * Returns the DOM elements to paint a glassPanes over, once a modal Form, message-box or file-chooser is shown with this widget as its 'displayParent'.<br>
 * If the widget is not rendered yet, a scout.DerredGlassPaneTarget is returned.<br>
 * In both cases the method _glassPaneTargets is called which may be overridden by the actual widget.
 */
scout.Widget.prototype.glassPaneTargets = function(element) {
  if (this.rendered) {
    return this._glassPaneTargets(element);
  }

  return scout.DeferredGlassPaneTarget.createFor(this, this._glassPaneTargets.bind(this, element));
};

scout.Widget.prototype._glassPaneTargets = function(element) {
  return [this.$container];
};

scout.Widget.prototype.toString = function() {
  var attrs = '';
  attrs += 'id=' + this.id;
  attrs += ' objectType=' + this.objectType;
  attrs += ' rendered=' + this.rendered;
  if (this.$container) {
    attrs += ' $container=' + scout.graphics.debugOutput(this.$container);
  }
  return 'Widget[' + attrs.trim() + ']';
};

/**
 * Returns the ancestors as string delimited by '\n'.
 * @param [count] the number of ancestors to be processed. Default is -1 which means all.
 */
scout.Widget.prototype.ancestorsToString = function(count) {
  var str = '',
    ancestors = this.ancestors();

  count = scout.nvl(count, -1);
  ancestors.some(function(ancestor, i) {
    if (count > -1 && i >= count) {
      return true;
    }
    if (i > 0 && i < ancestors.length - 1) {
      str += '\n';
    }
    str += ancestor.toString();
  });
  return str;
};

scout.Widget.prototype.resolveTextKeys = function(properties) {
  properties.forEach(function(property) {
    scout.texts.resolveTextProperty(this, property);
  }, this);
};

scout.Widget.prototype.resolveIconIds = function(properties) {
  properties.forEach(function(property) {
    scout.icons.resolveIconProperty(this, property);
  }, this);
};

scout.Widget.prototype._addWidgetProperties = function(properties) {
  this._addProperties('_widgetProperties', properties);
};

scout.Widget.prototype.isWidgetProperty = function(propertyName) {
  return this._widgetProperties.indexOf(propertyName) > -1;
};

scout.Widget.prototype._addCloneProperties = function(properties) {
  this._addProperties('_cloneProperties', properties);
};

scout.Widget.prototype.isCloneProperty = function(propertyName) {
  return this._cloneProperties.indexOf(propertyName) > -1;
};

scout.Widget.prototype._addPreserveOnPropertyChangeProperties = function(properties) {
  this._addProperties('_preserveOnPropertyChangeProperties', properties);
};

scout.Widget.prototype.isPreserveOnPropertyChangeProperty = function(propertyName) {
  return this._preserveOnPropertyChangeProperties.indexOf(propertyName) > -1;
};

scout.Widget.prototype._addProperties = function(propertyName, properties) {
  properties = scout.arrays.ensure(properties);
  properties.forEach(function(property) {
    if (this[propertyName].indexOf(property) > -1) {
      throw new Error(propertyName + ' already contains the property ' + property);
    }
    this[propertyName].push(property);
  }, this);
};

scout.Widget.prototype._eachProperty = function(model, func) {
  var propertyName, value, i;

  // Loop through primitive properties
  for (propertyName in model) {
    if (this._widgetProperties.indexOf(propertyName) > -1) {
      continue; // will be handled below
    }
    value = model[propertyName];
    func(propertyName, value);
  }

  //Loop through adapter properties (any order will do).
  for (i = 0; i < this._widgetProperties.length; i++) {
    propertyName = this._widgetProperties[i];
    value = model[propertyName];
    if (value === undefined) {
      continue;
    }

    func(propertyName, value, true);
  }
};

scout.Widget.prototype._removeWidgetProperties = function(properties) {
  if (Array.isArray(properties)) {
    scout.arrays.removeAll(this._widgetProperties, properties);
  } else {
    scout.arrays.remove(this._widgetProperties, properties);
  }
};

/**
 * Clones the widget and mirrors the events, see this.clone() and this.mirror() for details.
 */
scout.Widget.prototype.cloneAndMirror = function(model) {
  var clone = this.clone(model, {
    delegateAllPropertiesToClone: true
  });
  return clone;
};

/**
 * @returns the original widget from which this one was cloned. If it is not a clone, itself is returned.
 */
scout.Widget.prototype.original = function() {
  var original = this;
  while (original.cloneOf) {
    original = original.cloneOf;
  }
  return original;
};

/**
 * Clones the widget and returns the clone. Only the properties defined in this._cloneProperties are copied to the clone.
 * The parameter model has to contain at least the property 'parent'.
 *
 * OPTION                          DEFAULT VALUE   DESCRIPTION
 * --------------------------------------------------------------------------------------------------------
 * delegatePropertiesToClone       []              An array of all properties to be delegated from the original
 *                                                 to the to the clone when changed on the original widget.
 *
 * delegatePropertiesToOriginal    []              An array of all properties to be delegated from the clone
 *                                                 to the original when changed on the clone widget.
 *
 * excludePropertiesToOriginal     []              An array of all properties to be excluded from delegating
 *                                                 from the clone to the original in any cases.
 *
 * delegateEventsToOriginal        []              An array of all events to be delegated from the clone to
 *                                                 the original when fired on the clone widget.
 *
 * delegateAllPropertiesToClone    false           True to delegate all property changes from the original to
 *                                                 the clone.
 *
 * delegateAllPropertiesToOriginal false           True to delegate all property changes from the clone to
 *                                                 the original.
 *
 * @param model The model used to create the clone is a combination of the clone properties and this model.
 * Therefore this model may be used to override the cloned properties or to add additional properties.
 * @param options Options used for the clone widgets. See above.
 *
 */
scout.Widget.prototype.clone = function(model, options) {
  var clone, cloneModel;
  model = model || {};
  options = options || {};

  cloneModel = scout.objects.extractProperties(this, model, this._cloneProperties);
  clone = scout.create(this.objectType, cloneModel);
  clone.cloneOf = this;
  this._mirror(clone, options);

  if (this.logicalGrid) {
    // Create a new logical grid to make sure it does not influence the original widget
    // This also creates the correct grid config for the specific widget
    clone.setLogicalGrid(this.logicalGrid.objectType);
  } else {
    // Remove the grid if the original does not have one either
    clone.setLogicalGrid(null);
  }

  return clone;
};

scout.Widget.prototype._deepCloneProperties = function(clone, properties, options) {
  if (!properties) {
    return clone;
  }
  properties = scout.arrays.ensure(properties);
  properties.forEach(function(property) {
    var propertyValue = this[property],
      clonedProperty = null;
    if (propertyValue === undefined) {
      throw new Error('Property \'' + property + '\' is undefined. Deep copy not possible.');
    }
    if (this._widgetProperties.indexOf(property) > -1) {
      if (Array.isArray(propertyValue)) {
        clonedProperty = propertyValue.map(function(val) {
          return val.clone({
            parent: clone
          }, options);
        }.bind(this));

      } else {
        clonedProperty = propertyValue.clone({
          parent: clone
        }, options);
      }
    } else {
      if (Array.isArray(propertyValue)) {
        clonedProperty = propertyValue.map(function(val) {
          return val;
        });

      } else {
        clonedProperty = propertyValue;
      }
    }
    clone[property] = clonedProperty;
  }.bind(this));
};

/**
 * Delegates every property change event from the original widget to this cloned widget by calling the appropriate setter.
 * If no target is set it works only if this widget is a clone.
 */
scout.Widget.prototype.mirror = function(options, target) {
  target = target || this.cloneOf;
  if (!target) {
    throw new Error('No target for mirroring.');
  }
  this._mirror(target, options);
};

scout.Widget.prototype._mirror = function(clone, options) {
  var eventDelegator = scout.arrays.find(this.eventDelegators, function(eventDelegator) {
    return eventDelegator.clone === clone;
  });
  if (eventDelegator) {
    throw new Error('_mirror can only be called on not mirrored widgets. call unmirror first.');
  }
  options = options || {};
  eventDelegator = {
    clone: clone,
    originalToClone: scout.EventDelegator.create(this, clone, {
      delegateProperties: options.delegatePropertiesToClone,
      delegateAllProperties: options.delegateAllPropertiesToClone
    }),
    cloneToOriginal: scout.EventDelegator.create(clone, this, {
      delegateProperties: options.delegatePropertiesToOriginal,
      delegateAllProperties: options.delegateAllPropertiesToOriginal,
      excludeProperties: options.excludePropertiesToOriginal,
      delegateEvents: options.delegateEventsToOriginal
    })
  };
  this.eventDelegators.push(eventDelegator);
  clone.one('destroy', function() {
    this._unmirror(clone);
  }.bind(this));
};

scout.Widget.prototype.unmirror = function(target) {
  target = target || this.cloneOf;
  if (!target) {
    throw new Error('No target for unmirroring.');
  }
  this._unmirror(target);
};

scout.Widget.prototype._unmirror = function(target) {
  var eventDelegatorIndex = scout.arrays.findIndex(this.eventDelegators, function(eventDelegator) {
      return eventDelegator.clone === target;
    }),
    eventDelegator = (eventDelegatorIndex > -1) ? (this.eventDelegators.splice(eventDelegatorIndex, 1)[0]) : null;
  if (!eventDelegator) {
    return;
  }
  if (eventDelegator.originalToClone) {
    eventDelegator.originalToClone.destroy();
  }
  if (eventDelegator.cloneToOriginal) {
    eventDelegator.cloneToOriginal.destroy();
  }
};

scout.Widget.prototype._onParentDestroy = function(event) {
  if (this.destroyed) {
    return;
  }
  // If the parent is destroyed but the widget not make sure it gets a new parent
  // This ensures the old one may be properly garbage collected
  this.setParent(this.owner);
};

scout.Widget.prototype.callSetter = function(propertyName, value) {
  var setterFuncName = 'set' + scout.strings.toUpperCaseFirstLetter(propertyName);
  if (this[setterFuncName]) {
    this[setterFuncName](value);
  } else {
    this.setProperty(propertyName, value);
  }
};

/**
 * Traverses the object-tree (children) of this widget and searches for a widget with the given ID.
 * Returns the widget with the requested ID or null if no widget has been found.
 * @param widgetId
 */
scout.Widget.prototype.widget = function(widgetId) {
  return findWidgetRec(this);

  // ------ Helper functions -----

  function findWidgetRec(widget) {
    if (widget.id === widgetId) {
      return widget;
    }
    for (var i = 0; i < widget.children.length; i++) {
      var result = findWidgetRec(widget.children[i]);
      if (result) {
        return result;
      }
    }
    return null; // not found
  }
};

/**
 * @returns the parent for which the given function returns true.
 */
scout.Widget.prototype.findParent = function(func) {
  var parent = this.parent;
  while (parent) {
    if (func(parent)) {
      return parent;
    }
    parent = parent.parent;
  }
  return parent;
};

/**
 * Tries to set the focus on the widget.
 * <p>
 * By default the focus is set on the container but this may vary from widget to widget.
 * @returns true if the element could be focused, false if not
 */
scout.Widget.prototype.focus = function() {
  if (!this.rendered) {
    this._postRenderActions.push(this.focus.bind(this));
    return false;
  }

  return this.session.focusManager.requestFocus(this.getFocusableElement());
};

/**
 * Calls {@link focus()} and prevents the default behavior of the event if the focusing was successful.
 */
scout.Widget.prototype.focusAndPreventDefault = function(event) {
  if (this.focus()) {
    // Preventing blur is bad for touch devices because it prevents that the keyboard can close.
    // In that case focus() will return false because focus manager is disabled.
    event.preventDefault();
    return true;
  }
  return false;
};

/**
 * Brings the widget into view by scrolling the first scrollable parent.
 */
scout.Widget.prototype.reveal = function() {
  if (!this.rendered) {
    return;
  }
  var $scrollParent = this.$container.scrollParent();
  if ($scrollParent.length === 0) {
    // No scrollable parent found -> scrolling is not possible
    return;
  }
  scout.scrollbars.scrollTo($scrollParent, this.$container);
};

/**
 * @returns whether the widget is the currently active element
 */
scout.Widget.prototype.isFocused = function() {
  return this.rendered && scout.focusUtils.isActiveElement(this.getFocusableElement());
};

/**
 * @return true if the element is focusable, false if not.
 */
scout.Widget.prototype.isFocusable = function() {
  if (!this.rendered || !this.visible) {
    return false;
  }
  var elem = this.getFocusableElement();
  if (elem) {
    return $.ensure(elem).is(':focusable');
  }
  return false;
};

/**
 * This method returns the HtmlElement to be used when {@link #focus()} is called.
 * It can be overridden, in case the widget needs to return something other than this.$container[0].
 */
scout.Widget.prototype.getFocusableElement = function() {
  if (this.rendered && this.$container) {
    return this.$container[0];
  }
  return null;
};

/**
 * Visits every child of this widget in pre-order (top-down).<br>
 * This widget itself is not visited! Only child widgets are visited recursively.
 * <p>
 * The children with a different parent are excluded.<br>
 * This makes sure the child is not visited twice if the owner and the parent are not the same
 * (in that case the widget would be in the children list of the owner and of the parent).
 */
scout.Widget.prototype.visitChildren = function(visitor) {
  this.children.forEach(function(child) {
    if (child.parent === this) {
      visitor(child);
      child.visitChildren(visitor);
    }
  }, this);
};

/**
 * @returns {boolean} Whether or not the widget is rendered (or rendering) and the DOM $container isAttached()
 */
scout.Widget.prototype.isAttachedAndRendered = function() {
  return (this.rendered || this.rendering) && this.$container.isAttached();
};

/* --- STATIC HELPERS ------------------------------------------------------------- */

/**
 * @deprecated use {@link scout.widgets.get}
 */
scout.Widget.getWidgetFor = function($elem) {
  return scout.widgets.get($elem);
};

scout.Widget.cssClassAsArray = function(cssClass) {
  var cssClasses = [],
    cssClassesStr = cssClass || '';

  cssClassesStr = cssClassesStr.trim();
  if (cssClassesStr.length > 0) {
    cssClasses = cssClassesStr.split(' ');
  }
  return cssClasses;
};
