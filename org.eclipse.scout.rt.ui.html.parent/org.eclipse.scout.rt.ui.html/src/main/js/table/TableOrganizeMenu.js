scout.TableOrganizeMenu = function() {
  scout.TableOrganizeMenu.parent.call(this);
};

scout.inherits(scout.TableOrganizeMenu, scout.Menu);

// FIXME CRU: implement table organize menu, copy-columns-width menu (used for Scout SDK)
scout.TableOrganizeMenu.prototype._onMenuClicked = function(event) {
  var popup = new scout.PopupMenuItem($(event.target));
  popup.render();
  popup.addClassToBody('table-menu-organize');
  popup.appendToBody(this._createBody(popup));
  popup.alignTo();
};

scout.TableOrganizeMenu.prototype._createBody = function(popup) {
  return $('<button>').
    text(this.session.text('ResetTableColumns')).
    click(function() {
      var table = this.parent;
      popup.remove();
      this.session.send('resetColumns', table.id);
    }.bind(this)).
    one(scout.menus.CLOSING_EVENTS, $.suppressEvent);
};

