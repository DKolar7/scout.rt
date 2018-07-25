/*******************************************************************************
 * Copyright (c) 2014-2016 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.TreeSpecHelper = function(session) {
  this.session = session;
};

scout.TreeSpecHelper.prototype.createModel = function(nodes) {
  var model = createSimpleModel('Tree', this.session);

  if (nodes) {
    model.nodes = nodes;
  }
  model.enabled = true;
  return model;
};

scout.TreeSpecHelper.prototype.createModelFixture = function(nodeCount, depth, expanded) {
  return this.createModel(this.createModelNodes(nodeCount, depth, expanded));
};

scout.TreeSpecHelper.prototype.createModelNode = function(id, text, position) {
  return {
    id: id + '' || scout.objectFactory.createUniqueId(),
    text: text,
    childNodeIndex: position ? position : 0,
    enabled: true,
    checked: false
  };
};

scout.TreeSpecHelper.prototype.createModelNodes = function(nodeCount, depth, expanded) {
  return this.createModelNodesInternal(nodeCount, depth, expanded);
};

scout.TreeSpecHelper.prototype.createModelNodesInternal = function(nodeCount, depth, expanded, parentNode) {
  if (!nodeCount) {
    return;
  }

  var nodes = [],
    nodeId;
  if (!depth) {
    depth = 0;
  }
  for (var i = 0; i < nodeCount; i++) {
    nodeId = i;
    if (parentNode) {
      nodeId = parentNode.id + '_' + nodeId;
    }
    nodes[i] = this.createModelNode(nodeId, 'node ' + nodeId, i);
    nodes[i].expanded = expanded;
    if (depth > 0) {
      nodes[i].childNodes = this.createModelNodesInternal(nodeCount, depth - 1, expanded, nodes[i]);
    }
  }
  return nodes;
};

scout.TreeSpecHelper.prototype.createTree = function(model) {
  var defaults = {
    parent: this.session.desktop
  };
  model = $.extend({}, defaults, model);
  var tree = new scout.Tree();
  tree.init(model);
  return tree;
};

scout.TreeSpecHelper.prototype.createTreeAdapter = function(model) {
  var adapter = new scout.TreeAdapter();
  adapter.init(model);
  return adapter;
};

scout.TreeSpecHelper.prototype.createCompactTree = function(model) {
  var tree = new scout.CompactTree();
  tree.init(model);
  return tree;
};

scout.TreeSpecHelper.prototype.createCompactTreeAdapter = function(model) {
  model.objectType = 'Tree:Compact';
  var tree = new scout.TreeAdapter();
  tree.init(model);
  return tree;
};

scout.TreeSpecHelper.prototype.findAllNodes = function(tree) {
  return tree.$container.find('.tree-node');
};

scout.TreeSpecHelper.prototype.createNodeExpandedEvent = function(model, nodeId, expanded) {
  return {
    target: model.id,
    nodeId: nodeId,
    expanded: expanded,
    type: 'nodeExpanded'
  };
};

scout.TreeSpecHelper.prototype.selectNodesAndAssert = function(tree, nodes) {
  tree.selectNodes(nodes);
  this.assertSelection(tree, nodes);
};

scout.TreeSpecHelper.prototype.assertSelection = function(tree, nodes) {
  var $selectedNodes = tree.$selectedNodes();
  expect($selectedNodes.length).toBe(nodes.length);

  var selectedNodes = [];
  $selectedNodes.each(function() {
    selectedNodes.push($(this).data('node'));
  });

  expect(scout.arrays.equalsIgnoreOrder(nodes, selectedNodes)).toBeTruthy();
  expect(scout.arrays.equalsIgnoreOrder(nodes, tree.selectedNodes)).toBeTruthy();
};

scout.TreeSpecHelper.prototype.createNodesSelectedEvent = function(model, nodeIds) {
  return {
    target: model.id,
    nodeIds: nodeIds,
    type: 'nodesSelected'
  };
};

scout.TreeSpecHelper.prototype.createNodesInsertedEvent = function(model, nodes, commonParentNodeId) {
  return {
    target: model.id,
    commonParentNodeId: commonParentNodeId,
    nodes: nodes,
    type: 'nodesInserted'
  };
};

scout.TreeSpecHelper.prototype.createNodesInsertedEventTopNode = function(model, nodes) {
  return {
    target: model.id,
    nodes: nodes,
    type: 'nodesInserted'
  };
};

scout.TreeSpecHelper.prototype.createNodesDeletedEvent = function(model, nodeIds, commonParentNodeId) {
  return {
    target: model.id,
    commonParentNodeId: commonParentNodeId,
    nodeIds: nodeIds,
    type: 'nodesDeleted'
  };
};

scout.TreeSpecHelper.prototype.createAllChildNodesDeletedEvent = function(model, commonParentNodeId) {
  return {
    target: model.id,
    commonParentNodeId: commonParentNodeId,
    type: 'allChildNodesDeleted'
  };
};

scout.TreeSpecHelper.prototype.createNodeChangedEvent = function(model, nodeId) {
  return {
    target: model.id,
    nodeId: nodeId,
    type: 'nodeChanged'
  };
};

scout.TreeSpecHelper.prototype.createNodesUpdatedEvent = function(model, nodes) {
  return {
    target: model.id,
    nodes: nodes,
    type: 'nodesUpdated'
  };
};

scout.TreeSpecHelper.prototype.createChildNodeOrderChangedEvent = function(model, childNodeIds, parentNodeId) {
  return {
    target: model.id,
    parentNodeId: parentNodeId,
    childNodeIds: childNodeIds,
    type: 'childNodeOrderChanged'
  };
};

scout.TreeSpecHelper.prototype.createTreeEnabledEvent = function(model, enabled) {
  return {
    target: model.id,
    type: 'property',
    properties: {
      enabled: enabled
    }
  };
};
