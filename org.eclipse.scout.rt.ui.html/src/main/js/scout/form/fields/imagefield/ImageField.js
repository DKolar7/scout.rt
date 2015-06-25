scout.ImageField = function() {
  scout.ImageField.parent.call(this);
  this.$fieldContainer;
  this._addAdapterProperties('menus');
};
scout.inherits(scout.ImageField, scout.FormField);

scout.ImageField.prototype.init = function(model, session) {
  scout.ImageField.parent.prototype.init.call(this, model, session);
  this._syncMenus(this.menus);
};

scout.ImageField.prototype._render = function($parent) {
  this.addContainer($parent, 'image-field', new scout.ImageFieldLayout(this));
  this.addFieldContainer($('<div>'));

  if (this.scrollBarEnabled) {
    scout.scrollbars.install(this.$fieldContainer, {
      invertColors: true
    });
    this.session.detachHelper.pushScrollable(this.$fieldContainer);
  }

  var $field = $('<img>')
    .appendTo(this.$fieldContainer)
    .on('load', this._onImageLoad.bind(this))
    .on('error', this._onImageError.bind(this));

  this.addLabel();
  this.addMandatoryIndicator();
  this.addField($field);
  this.addStatus();
  if (this.menus) {
    for (var j = 0; j < this.menus.length; j++) {
      this.keyStrokeAdapter.registerKeyStroke(this.menus[j]);
    }
  }
};

scout.ImageField.prototype._onImageLoad = function(event) {
  this.$field.removeClass('broken');
  scout.scrollbars.update(this.$fieldContainer);
  this.revalidateLayoutTree();
};

scout.ImageField.prototype._onImageError = function(event) {
  this.$field.addClass('empty broken');
  scout.scrollbars.update(this.$fieldContainer);
  this.revalidateLayoutTree();
};

scout.ImageField.prototype._renderProperties = function() {
  scout.ImageField.parent.prototype._renderProperties.call(this);
  this._renderImageUrl();
  this._renderAutoFit();
  this._renderMenus(this.menus);
};

scout.ImageField.prototype._remove = function() {
  if (this.scrollBarEnabled) {
    this.session.detachHelper.removeScrollable(this.$fieldContainer);
  }
};

scout.ImageField.prototype._renderImageUrl = function() {
  this.$field.attr('src', this.imageUrl);
  // Hide <img> when it has no content to suppress the browser's 'broken image' icon
  this.$field.toggleClass('empty', !this.imageUrl);
};

scout.ImageField.prototype._renderAutoFit = function() {
  this.$field.toggleClass('autofit', this.autoFit);
};

scout.ImageField.prototype._syncMenus = function(menus) {
  if (this._hasMenus()) {
    this.menus.forEach(function(menu) {
      this.keyStrokeAdapter.unregisterKeyStroke(menu);
    }, this);
  }
  this.menus = menus;
  if (this._hasMenus()) {
    this.menus.forEach(function(menu) {
      if (menu.enabled) {
        this.keyStrokeAdapter.registerKeyStroke(menu);
      }
    }, this);
  }
};

scout.ImageField.prototype._renderMenus = function() {
  this._updateMenus();
};

scout.ImageField.prototype._renderMenusVisible = function() {
  this._updateMenus();
};

scout.ImageField.prototype._updateMenus = function() {
  this.$container.toggleClass('has-menus', this._hasMenus() && this.menusVisible);
};

scout.ImageField.prototype._hasMenus = function() {
  return !!(this.menus && this.menus.length > 0);
};

/**
 * @override FormField.js
 */
scout.ImageField.prototype._onStatusClick = function(event) {
  if (this._hasMenus()) {
    // showing menus is more important than showing tooltips
    var popup = new scout.ContextMenuPopup(this.session, this.menus, {
      cloneMenuItems: false,
      $anchor: this.$status
    });
    popup.render();
  } else {
    // super call shows tooltip
    scout.ValueField.parent.prototype._onStatusClick.call(this);
  }
};
