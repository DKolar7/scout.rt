// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.TreeCompact = function() {
  scout.TreeCompact.parent.call(this);
  this.$filter;
  this.$nodesWrapper;
  this.$nodes;
  this._domMap = {};
  this._selectedNodeIndex = -1;
};
scout.inherits(scout.TreeCompact, scout.ModelAdapter);

scout.TreeCompact.prototype._render = function($parent) {
  this.$container = $parent.appendDiv('compact-tree');

  this.$filter = $('<input>').
    attr('type', 'text').
    placeholder(this.session.text('ui.FilterBy_')).
    addClass('text-field').
    appendTo(this.$container).
    on('input', this._onInput.bind(this)).
    keydown(this._onKeyDown.bind(this));

  var layout = new scout.TreeCompactLayout(this);
  this.htmlComp = new scout.HtmlComponent(this.$container, this.session);
  this.htmlComp.setLayout(layout);

  this.$nodesWrapper = $.makeDiv('nodes-wrapper').appendTo(this.$container);
  scout.scrollbars.install(this.$nodesWrapper, {invertColors:true, borderless:true});
  this.session.detachHelper.pushScrollable(this.$nodesWrapper);
  this.$nodes = $.makeDiv('nodes').appendTo(this.$nodesWrapper);
  this._renderNodes();
};

scout.TreeCompact.prototype._remove = function() {
  this.session.detachHelper.removeScrollable(this.$nodesWrapper);
};

scout.TreeCompact.prototype._renderNodes = function(filter) {
  var i, j, node, $node, childNode, $childNode;
  for (i=0; i<this.nodes.length; i++) {
    node = this.nodes[i];
    $node = $.makeDiv('section').appendTo(this.$nodes);
    $.makeDiv('title').appendTo($node).text(node.text);
    this._domMap[node.id] = $node;
    for (j=0; j<node.childNodes.length; j++) {
      childNode = node.childNodes[j];
      $childNode = $.makeDiv('process').
        data('node', childNode).
        click(this._onNodeClick.bind(this)).
        text(childNode.text).
        appendTo($node);
      this._domMap[childNode.id] = $childNode;
    }
  }
};

scout.TreeCompact.prototype._updateNodes = function() {
  var i, j, node, childNode, $dom;
  for (i=0; i<this.nodes.length; i++) {
    node = this.nodes[i];
    $dom = this._domMap[node.id];
    $dom.setVisible(node.visible);
    if (node.visible) {
      for (j=0; j<node.childNodes.length; j++) {
        childNode = node.childNodes[j];
        $dom = this._domMap[childNode.id];
        $.log.debug('updateNode id=' + childNode.id + ' visible=' + childNode.visible);
        $dom.setVisible(childNode.visible);
      }
    }
  }
  scout.scrollbars.update(this.$nodesWrapper);
};

scout.TreeCompact.prototype._onInput = function(event) {
  this._applyFilter(this.$filter.val());
};

scout.TreeCompact.prototype._applyFilter = function(filterText) {
  if (filterText) {
    $.log.debug('filter nodes='+filterText);
    this._filterNodes(filterText);
  } else {
    $.log.debug('expand all nodes');
    this._expandAllNodes();
  }
  this._selectedNodeIndex = -1;
  this.$nodes.find('.selected').removeClass('selected');
  this._updateNodes();
};

scout.TreeCompact.prototype._onKeyDown = function(event) {
  switch (event.which) {
    case scout.keys.UP:
      this._moveSelection(-1);
      return false;
    case scout.keys.DOWN:
      this._moveSelection(1);
      return false;
    case scout.keys.ENTER:
      if (this._selectedNodeIndex !== -1) {
        var node = this.$nodes.find('.selected').data('node');
        this._selectNode(node);
      }
      return false;
    default:
      return true;
  }
};

scout.TreeCompact.prototype._moveSelection = function(diff) {
  var oldSelectedNodeIndex = this._selectedNodeIndex,
    tmpSelectedNodeIndex = this._selectedNodeIndex + diff,
    $nodes = this.$nodes.find('.process:visible'),
    numNodes = $nodes.length;
  if (tmpSelectedNodeIndex >= numNodes) {
    tmpSelectedNodeIndex = 0;
  } else if (tmpSelectedNodeIndex < 0) {
    tmpSelectedNodeIndex = numNodes - 1;
  }
  if (oldSelectedNodeIndex !== tmpSelectedNodeIndex) {
    $.log.debug('_moveSelection to node with index='+ tmpSelectedNodeIndex);
    this._selectedNodeIndex = tmpSelectedNodeIndex;
    $($nodes[oldSelectedNodeIndex]).removeClass('selected');
    $($nodes[tmpSelectedNodeIndex]).addClass('selected');
  }
};

scout.TreeCompact.prototype._expandAllNodes = function() {
  var i, j, node, childNode;
  for (i=0; i<this.nodes.length; i++) {
    node = this.nodes[i];
    node.expanded = true;
    node.visible = true;
    for (j=0; j<node.childNodes.length; j++) {
      childNode = node.childNodes[j];
      childNode.visible = true;
    }
  }
};

scout.TreeCompact.prototype._matches = function(node, regexp) {
  $.log.debug('text=' + node.text + ' id=' + node.id + ' regexp=' + regexp + ' matches=' + node.text.match(regexp));
  return node.text.match(regexp) !== null;
};

/**
 * Sets the visible and expanded state of the nodes depending on the given filter.
 * The rules applied here are:
 * 1. when filter matches a top-level root -> expand all child-nodes
 * 2. when filter matches a child-node -> expand parent-node
 * 3. when parent-node doesn't match and has no child-nodes that match -> make parent-node invisible
 * @param filter
 */
scout.TreeCompact.prototype._filterNodes = function(filter) {
  var i, j, node, childNode, expanded,
    regexp = new RegExp(filter, 'i');
  for (i=0; i<this.nodes.length; i++) {
    node = this.nodes[i];
    expanded = this._matches(node, regexp);
    node.expanded = expanded;
    for (j=0; j<node.childNodes.length; j++) {
      childNode = node.childNodes[j];
      if (expanded) {
        // show all sub nodes
        // note: we do not read 'node.expanded' here, since that variable may change
        // when a sub node becomes visible.
        childNode.visible = true;
      } else {
        // only visible when sub node matches
        // must expand parent node
        childNode.visible = this._matches(childNode, regexp);
        if (childNode.visible) {
          node.expanded = true;
        }
      }
    }
    // if node is node is not expanded yet, make invisible
    node.visible = node.expanded;
  }
};

scout.TreeCompact.prototype._onNodeClick = function(event) {
  var node = $(event.target).data('node');
  this._selectNode(node);
};

scout.TreeCompact.prototype._selectNode = function(node) {
  $.log.debug('_selectNode id=' + node.id + ' text=' + node.text);

  // Reset filter (small delay, wait for form detach)
  setTimeout(function() {
    this.$filter.val('');
    this._applyFilter('');
  }.bind(this), 100);

  this.session.send(this.id, 'nodeAction', {
    nodeId: node.id
  });
};
