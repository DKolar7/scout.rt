/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.PageWithTable = function() {
  scout.PageWithTable.parent.call(this);

  this.nodeType = "table";
  this.alwaysCreateChildPage = true; // FIXME [awe] 6.1 - change to default 'false'. Check if AutoLeafPageWithNodes work
};
scout.inherits(scout.PageWithTable, scout.Page);

scout.PageWithTable.prototype._createChildPageInternal = function(tableRow) {
  var childPage = this.createChildPage(tableRow);
  if (childPage === null && this.alwaysCreateChildPage) {
    childPage = this.createDefaultChildPage(tableRow);
  }
  return childPage;
};

scout.PageWithTable.prototype.createChildPage = function(tableRow) {
  return null;
};

scout.PageWithTable.prototype.createDefaultChildPage = function(tableRow) {
  return new scout.AutoLeafPageWithNodes(this.tree, tableRow);
};

// AbstractPageWithTable#P_TableListener hat einen listener auf der table, über die listener wird
// der baum mit der tabelle synchronisiert

/**
 * @override TreeNode.js
 */
scout.PageWithTable.prototype.loadChildren = function() {
  this.loadTableData();
  var childPage, childNodes = [];
  // FIXME [awe] 6.1 create child nodes for table rows, check how this is done in Java model
  this.table.rows.forEach(function(row) {
    childPage = this._createChildPageInternal(row);
    if (childPage !== null) {
      childNodes.push(childPage);
    }
  }, this);
  this.childNodes = childNodes;
  this.tree._onPageChanged2(this); // FIXME 6.1 [awe] - remove this hack
};
