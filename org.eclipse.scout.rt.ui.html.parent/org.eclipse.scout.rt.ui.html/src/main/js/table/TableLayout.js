scout.TableLayout = function(table) {
  scout.TableLayout.parent.call(this);
  this.table = table;
  this.invalidateOnResize = false;
};
scout.inherits(scout.TableLayout, scout.AbstractLayout);

scout.TableLayout.prototype.layout = function($container) {
  var menubar = this.table.menubar,
    footer = this.table.footer,
    header = this.table.header,
    $data = this.table.$data,
    height = 0;

  if (menubar.$container.isVisible()){
    height += scout.graphics.getSize(menubar.$container).height;
  }
  if (footer) {
    height += scout.graphics.getSize(footer.$container).height;
  }
  if (header) {
    height += scout.graphics.getSize(header.$container).height;
  }
  height += $data.cssMarginTop() + $data.cssMarginBottom();
  $data.css('height', 'calc(100% - '+ height + 'px)');
};

scout.TableLayout.prototype.preferredLayoutSize = function($comp) {
  return scout.graphics.getSize($comp);
};
