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
describe("Outline", function() {
  var helper, menuHelper, formHelper, session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new scout.OutlineSpecHelper(session);
    menuHelper = new scout.MenuSpecHelper(session);
    formHelper = new scout.FormSpecHelper(session);
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  function createNodesDeletedEvent(model, nodeIds, commonParentNodeId) {
    return {
      target: model.id,
      commonParentNodeId: commonParentNodeId,
      nodeIds: nodeIds,
      type: 'nodesDeleted'
    };
  }

  function createAllChildNodesDeletedEvent(model, commonParentNodeId) {
    return {
      target: model.id,
      commonParentNodeId: commonParentNodeId,
      type: 'allChildNodesDeleted'
    };
  }

  describe("collapsing", function() {
    // Regression test for erroneous behavior of MessageBoxController
    it("still allows a messagebox to be shown", function() {
      var outline = helper.createOutlineWithOneDetailTable();
      session.desktop.outline = outline;

      var model = {
        session: session,
        parent: session.desktop,
        severity: scout.Status.Severity.ERROR
      };
      var messageBox = scout.create('MessageBox', model);

      // This collapses the registered outline
      session.desktop.setNavigationVisible(false);

      messageBox.setDisplayParent(outline);
      outline.messageBoxController.registerAndRender(messageBox);

      expect(messageBox.rendered).toBe(true);
    });
  });

  describe("dispose", function() {
    var model, tree, node0;

    beforeEach(function() {
      // A large tree is used to properly test recursion
      model = helper.createModelFixture(3, 2, true);
      tree = helper.createOutline(model);
      node0 = tree.nodes[0];
    });

    it("calls onNodeDeleted for every node to be able to cleanup", function() {
      spyOn(tree, '_onNodeDeleted');
      tree.destroy();
      expect(tree._onNodeDeleted.calls.count()).toBe(39);
    });

    it("calls onNodeDeleted for every node (which was not already deleted before) to be able to cleanup", function() {
      spyOn(tree, '_onNodeDeleted');

      tree.deleteNodes([node0]);
      expect(tree._onNodeDeleted.calls.count()).toBe(13);

      tree._onNodeDeleted.calls.reset();
      tree.destroy();
      expect(tree._onNodeDeleted.calls.count()).toBe(26);
    });

  });

  describe("deleteNodes", function() {
    var model, tree, node0;

    beforeEach(function() {
      // A large tree is used to properly test recursion
      model = helper.createModelFixture(3, 2, true);
      tree = helper.createOutline(model);
      node0 = tree.nodes[0];
    });

    it("calls onNodeDeleted for every node to be able to cleanup", function() {
      spyOn(tree, '_onNodeDeleted');

      tree.deleteNodes([node0]);
      expect(tree._onNodeDeleted.calls.count()).toBe(13);
    });

  });

  describe("deleteAllChildNodes", function() {
    var model, tree;

    beforeEach(function() {
      // A large tree is used to properly test recursion
      model = helper.createModelFixture(3, 2, true);
      tree = helper.createOutline(model);
    });

    it("calls onNodeDeleted for every node to be able to cleanup", function() {
      spyOn(tree, '_onNodeDeleted');

      tree.deleteAllChildNodes();
      expect(tree._onNodeDeleted.calls.count()).toBe(39);
      expect(scout.objects.countOwnProperties(tree.nodesMap)).toBe(0);
    });

  });

  describe("navigateToTop", function() {

    it("collapses all nodes in bread crumb mode", function() {
      var model = helper.createModelFixture(1, 1);
      var tree = helper.createOutline(model);
      var node0 = tree.nodes[0];

      tree.displayStyle = scout.Tree.DisplayStyle.BREADCRUMB;
      tree.render();

      tree.selectNodes(node0);

      expect(tree.selectedNodes.indexOf(node0) > -1).toBe(true);
      expect(node0.expanded).toBe(true);

      tree.navigateToTop();

      expect(tree.selectedNodes.length).toBe(0);
      expect(node0.expanded).toBe(false);
    });
  });

  describe("selectNodes", function() {
    var model, outline, node;

    beforeEach(function() {
      model = helper.createModelFixture(3, 2, true);
      outline = helper.createOutline(model);
      node = outline.nodes[0];
    });

    it("handle navigateUp only once", function() {
      outline.selectNodes(node);
      outline.navigateUpInProgress = true;
      outline.selectNodes([]);
      expect(outline.navigateUpInProgress).toBe(false);
    });

    // we must override the _render* methods for this test-case, since we had to
    // implement a lot more of set-up code to make these methods work.
    it("otherwise handle single selection (or do nothing when selection is != 1 node)", function() {
      node.detailFormVisibleByUi = false;
      outline.navigateUpInProgress = false;
      outline._renderSelection = function() {};
      outline._renderMenus = function() {};

      // don't change the visibleByUi flag when selection is != 1
      outline.selectNodes([]);
      expect(node.detailFormVisibleByUi).toBe(false);

      // set the visibleByUi flag to true when selection is exactly 1
      outline.selectNodes([node]);
      expect(node.detailFormVisibleByUi).toBe(true);
    });

  });

  describe("updateDetailMenus", function() {

    it("adds the empty space menus of the detail table to the detail menu bar", function() {
      var outline = helper.createOutlineWithOneDetailTable();
      outline.setCompact(true);
      outline.setEmbedDetailContent(true);
      var node0 = outline.nodes[0];
      node0.detailTable.menus = [
        menuHelper.createMenu({
          menuTypes: ['Table.SingleSelection']
        }), menuHelper.createMenu({
          menuTypes: ['Table.EmptySpace']
        })
      ];
      expect(outline.detailMenuBarVisible).toBe(false);
      expect(outline.detailMenuBar.menuItems.length).toBe(0);

      outline.selectNodes(node0);
      expect(outline.detailMenuBarVisible).toBe(true);
      expect(outline.detailMenuBar.menuItems.length).toBe(1);
      expect(outline.detailMenuBar.menuItems[0]).toBe(node0.detailTable.menus[1]);
    });

    it("adds the single selection menus of the parent detail table to the detail menu bar", function() {
      var outline = helper.createOutlineWithOneDetailTable();
      outline.setCompact(true);
      outline.setEmbedDetailContent(true);
      var node0 = outline.nodes[0];
      node0.detailTable.menus = [
        menuHelper.createMenu({
          menuTypes: ['Table.SingleSelection']
        }), menuHelper.createMenu({
          menuTypes: ['Table.EmptySpace']
        })
      ];
      expect(outline.detailMenuBarVisible).toBe(false);
      expect(outline.detailMenuBar.menuItems.length).toBe(0);

      outline.selectNodes(node0.childNodes[0]);
      expect(outline.detailMenuBarVisible).toBe(true);
      expect(outline.detailMenuBar.menuItems.length).toBe(1);
      expect(outline.detailMenuBar.menuItems[0]).toBe(node0.detailTable.menus[0]);
    });

    it("attaches a listener to the detail table to get dynamic menu changes", function() {
      var outline = helper.createOutlineWithOneDetailTable();
      outline.setCompact(true);
      outline.setEmbedDetailContent(true);
      var node0 = outline.nodes[0];
      expect(outline.detailMenuBarVisible).toBe(false);
      expect(outline.detailMenuBar.menuItems.length).toBe(0);

      outline.selectNodes(node0);
      expect(outline.detailMenuBarVisible).toBe(false);
      expect(outline.detailMenuBar.menuItems.length).toBe(0);

      // Menus change on table -> detail menu bar needs to be updated as well
      var menu = menuHelper.createModel('menu', '', ['Table.EmptySpace']);
      node0.detailTable.setMenus([menu]);
      expect(outline.detailMenuBarVisible).toBe(true);
      expect(outline.detailMenuBar.menuItems.length).toBe(1);
      expect(outline.detailMenuBar.menuItems[0]).toBe(node0.detailTable.menus[0]);
    });

    it("removes the listener from the detail tables on selection changes and destroy", function() {
      var outline = helper.createOutlineWithOneDetailTable();
      outline.setCompact(true);
      outline.setEmbedDetailContent(true);
      var node0 = outline.nodes[0];
      var node1 = outline.nodes[1];
      var initialListenerCount = node0.detailTable.events._eventListeners.length;

      outline.selectNodes(node0);
      var selectionListenerCount = node0.detailTable.events._eventListeners.length;
      expect(selectionListenerCount).toBe(initialListenerCount + 3); // destroy and propertyChange listener

      outline.selectNodes(node1);
      selectionListenerCount = node0.detailTable.events._eventListeners.length;
      expect(selectionListenerCount).toBe(initialListenerCount + 1); // listeners removed

      outline.selectNodes(node0);
      selectionListenerCount = node0.detailTable.events._eventListeners.length;
      expect(selectionListenerCount).toBe(initialListenerCount + 3); // listeners attached again

      outline.nodes[0].detailTable.destroy();
      expect(node0.detailTable.events._eventListeners.length).toBe(0); // every listener should be removed now
    });
  });

  describe("click on a node inside the detail content", function() {

    it("does not modify the outline", function() {
      var outline = helper.createOutline(helper.createModelFixture(3, 2));
      outline.setCompact(true);
      outline.setEmbedDetailContent(true);
      var node0 = outline.nodes[0];
      outline.render();
      outline.selectNodes(outline.nodes[1]);

      // The outline node contains a tree as detail node (real life case would be a form with a tree field, but this is easier to test)
      var treeHelper = new scout.TreeSpecHelper(session);
      var treeModel = treeHelper.createModelFixture(3, 3);
      treeModel.nodes[0].id = scout.objectFactory.createUniqueId(); // tree helper doesn't use unique ids -> do it here
      var tree = treeHelper.createTree(treeModel);
      outline.setDetailContent(tree);

      spyOn(outline, 'selectNodes');
      spyOn(tree, 'selectNodes');

      tree.nodes[0].$node.triggerMouseDown();

      // Outline must not react to clicks on tree nodes of the detail content tree
      expect(outline.selectNodes).not.toHaveBeenCalled();
      expect(tree.selectNodes).toHaveBeenCalledWith(tree.nodes[0]);
    });

  });

  describe("outlineOverview", function() {

    beforeEach(function() {
      session = sandboxSession({
        desktop: {
          navigationVisible: true,
          headerVisible: true,
          benchVisible: true
        }
      });
    });

    it("is displayed when no node is selected", function() {
      var outline = helper.createOutline(helper.createModelFixture(3, 2));
      session.desktop.setOutline(outline);
      expect(outline.outlineOverview.rendered).toBe(true);

      outline.selectNodes(outline.nodes[0]);
      expect(outline.outlineOverview.rendered).toBe(false);
    });

    it("is not displayed if outlineOverviewVisible is false", function() {
      var outline = helper.createOutline(helper.createModelFixture(3, 2));
      session.desktop.setOutline(outline);
      expect(outline.outlineOverview.rendered).toBe(true);

      outline.setOutlineOverviewVisible(false);
      expect(outline.outlineOverview).toBe(null);

      outline.setOutlineOverviewVisible(true);
      expect(outline.outlineOverview.rendered).toBe(true);
    });

    it("uses the TileOutlineOverview by default", function() {
      var outline = helper.createOutline(helper.createModelFixture(3, 2));
      session.desktop.setOutline(outline);
      expect(outline.outlineOverview instanceof scout.TileOutlineOverview).toBe(true);
    });

    it("may be replaced by another OutlineOverview", function() {
      var model = helper.createModelFixture(3, 2);
      model.outlineOverview = {
        objectType: 'OutlineOverview'
      };
      var outline = helper.createOutline(model);
      session.desktop.setOutline(outline);
      expect(outline.outlineOverview instanceof scout.OutlineOverview).toBe(true);
      expect(outline.outlineOverview instanceof scout.TileOutlineOverview).toBe(false);

      var outlineOverview = scout.create('TileOutlineOverview', {parent: outline});
      outline.setOutlineOverview(outlineOverview);
      expect(outline.outlineOverview instanceof scout.TileOutlineOverview).toBe(true);
      expect(outline.outlineOverview).toBe(outlineOverview);
    });

    it("is replaced by the default detail form if there is one", function() {
      var outline = helper.createOutline(helper.createModelFixture(3, 2));
      session.desktop.setOutline(outline);
      expect(outline.outlineOverview.rendered).toBe(true);

      var form = formHelper.createFormWithOneField();
      outline.setDefaultDetailForm(form);
      expect(outline.outlineOverview).toBe(null);
      expect(outline.defaultDetailForm.rendered).toBe(true);
    });

  });

});
