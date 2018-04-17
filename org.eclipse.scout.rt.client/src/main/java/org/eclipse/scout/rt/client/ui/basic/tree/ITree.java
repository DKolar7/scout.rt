/*******************************************************************************
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.basic.tree;

import java.security.Permission;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import org.eclipse.scout.rt.client.ui.AbstractEventBuffer;
import org.eclipse.scout.rt.client.ui.IAppLinkCapable;
import org.eclipse.scout.rt.client.ui.IEventHistory;
import org.eclipse.scout.rt.client.ui.IStyleable;
import org.eclipse.scout.rt.client.ui.IWidget;
import org.eclipse.scout.rt.client.ui.action.keystroke.IKeyStroke;
import org.eclipse.scout.rt.client.ui.action.menu.root.IContextMenuOwner;
import org.eclipse.scout.rt.client.ui.action.menu.root.ITreeContextMenu;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPage;
import org.eclipse.scout.rt.client.ui.dnd.IDNDSupport;
import org.eclipse.scout.rt.client.ui.form.fields.treebox.ITreeBox;
import org.eclipse.scout.rt.client.ui.form.fields.treefield.ITreeField;
import org.eclipse.scout.rt.platform.util.visitor.IDepthFirstTreeVisitor;
import org.eclipse.scout.rt.platform.util.visitor.TreeVisitResult;
import org.eclipse.scout.rt.shared.data.form.fields.treefield.AbstractTreeFieldData;
import org.eclipse.scout.rt.shared.dimension.IEnabledDimension;

public interface ITree extends IWidget, IDNDSupport, IStyleable, IAppLinkCapable, IContextMenuOwner, IEnabledDimension {

  String PROP_TITLE = "title";
  String PROP_ENABLED = "enabled";
  String PROP_DRAG_ENABLED = "dragEnabled";
  String PROP_ICON_ID = "iconId";
  String PROP_DEFAULT_ICON_ID = "defaultIconId";
  String PROP_MULTI_SELECT = "multiSelect";
  String PROP_MULTI_CHECK = "multiCheck";
  String PROP_CHECKABLE = "checkable";
  String PROP_AUTO_CHECK_CHILDREN = "autoCheckChildren";
  String PROP_LAZY_EXPANDING_ENABLED = "lazyExpandingEnabled";
  /**
   * Integer default -1
   */
  String PROP_NODE_HEIGHT_HINT = "propNodeHeightHint";
  String PROP_ROOT_NODE_VISIBLE = "rootNodeVisible";
  String PROP_ROOT_HANDLES_VISIBLE = "rootHandlesVisible";
  String PROP_KEY_STROKES = "keyStrokes";
  String PROP_SCROLL_TO_SELECTION = "scrollToSelection";
  String PROP_DISPLAY_STYLE = "displayStyle";
  String PROP_TOGGLE_BREADCRUMB_STYLE_ENABLED = "toggleBreadcrumbStyleEnabled";

  String DISPLAY_STYLE_DEFAULT = "default";
  String DISPLAY_STYLE_BREADCRUMB = "breadcrumb";

  /**
   * Object
   * <p>
   * Container of this tree, {@link IPage}, {@link ITreeField}, {@link ITreeBox}
   * <p>
   * https://bugs.eclipse.org/bugs/show_bug.cgi?id=388227
   *
   * @since 3.8.1
   */
  String PROP_CONTAINER = "container";

  /**
   * {@link ITreeContextMenu}
   */
  String PROP_CONTEXT_MENU = "contextMenu";

  /**
   * @deprecated will be removed with 8.0, use {@link #init()} or {@link #reinit()} instead
   */
  @Deprecated
  void initTree();

  /**
   * @deprecated will be removed with 8.0,u se {@link #dispose()} instead
   */
  @Deprecated
  void disposeTree();

  /**
   * @since 5.1.0
   */
  AbstractEventBuffer<TreeEvent> createEventBuffer();

  void requestFocus();

  @Override
  ITreeContextMenu getContextMenu();

  /**
   * @see #setScrollToSelection()
   */
  boolean isScrollToSelection();

  /**
   * @param b
   *          true: advices the attached ui to make the current selection visible. The current selection will be
   *          scrolled to visible (again, whenever the table size changes).
   */
  void setScrollToSelection(boolean b);

  /**
   * May be used when {@link #isScrollToSelection()} = false on individual occasion where selection shall be scrolled to
   * visible, the property scrollToVisible remains untouched.
   * <p>
   * This is a one-time scroll advise to the ui
   */
  void scrollToSelection();

  List<ITreeNodeFilter> getNodeFilters();

  boolean hasNodeFilters();

  /**
   * adding a filter multiple times is supported. This only adds it the first time. The other times it just calls
   * {@link #applyNodeFilters()}
   */
  void addNodeFilter(ITreeNodeFilter filter);

  void removeNodeFilter(ITreeNodeFilter filter);

  /**
   * (Re-) applies all node filters to the tree.
   * <p>
   * This can be useful when the state of a node filter was changed without adding or removing it.
   * <p>
   * {@link #addNodeFilter(ITreeNodeFilter)} and {@link #removeNodeFilter(ITreeNodeFilter)} automatically apply the
   * filters to the tree.
   */
  void applyNodeFilters();

  ITreeNode getRootNode();

  void setRootNode(ITreeNode root);

  String getTitle();

  void setTitle(String s);

  String getIconId();

  void setIconId(String iconId);

  String getDefaultIconId();

  void setDefaultIconId(String defaultIconId);

  /**
   * @return path using delimiter " - "
   */
  String getPathText(ITreeNode node);

  String getPathText(ITreeNode node, String delimiter);

  Object getProperty(String name);

  /**
   * With this method it's possible to set (custom) properties.
   * <p>
   * <b>Important: </b> Although this method is intended to be used for custom properties, it's actually possible to
   * change main properties as well. Keep in mind that directly changing main properties may result in unexpected
   * behavior, so do it only if you really know what you are doing. Rather use the officially provided api instead. <br>
   * Example for an unexpected behavior: setVisible() does not only set the property PROP_VISIBLE but also executes
   * additional code. This code would NOT be executed by directly setting the property PROP_VISIBLE with setProperty().
   */
  void setProperty(String name, Object value);

  boolean hasProperty(String name);

  boolean isAutoTitle();

  void setAutoTitle(boolean b);

  boolean isDragEnabled();

  void setDragEnabled(boolean b);

  ITreeNode findNode(Object primaryKey);

  List<ITreeNode> findNodes(Collection<?> primaryKeys);

  boolean isRootNodeVisible();

  void setRootNodeVisible(boolean b);

  boolean isRootHandlesVisible();

  void setRootHandlesVisible(boolean b);

  void ensureVisible(ITreeNode node);

  /**
   * to expand all nodes under the given parent node, parent node inclusive.
   *
   * @param parent
   *          the start node for the expansion.
   */
  void expandAll(ITreeNode parent);

  /**
   * to collapse all nodes under the given parent node, parent node inclusive.
   *
   * @param parent
   *          the start node for collapsing.
   */
  void collapseAll(ITreeNode parent);

  boolean isEnabled();

  void setEnabled(boolean b);

  boolean isEnabledGranted();

  void setEnabledGranted(boolean b);

  void setEnabledPermission(Permission p);

  boolean isLazyExpandingEnabled();

  void setLazyExpandingEnabled(boolean lazyExpandingEnabled);

  int getSelectedNodeCount();

  ITreeNode getSelectedNode();

  Set<ITreeNode> getSelectedNodes();

  boolean isAutoCheckChildNodes();

  void setAutoCheckChildNodes(boolean b);

  boolean isSelectedNode(ITreeNode node);

  void selectNode(ITreeNode node);

  void selectNode(ITreeNode node, boolean append);

  void selectNodes(Collection<? extends ITreeNode> nodes, boolean append);

  void deselectNode(ITreeNode node);

  void deselectNodes(Collection<? extends ITreeNode> nodes);

  /**
   * Select the previous selectable node in this tree. Does not expand any nodes.
   */
  void selectPreviousNode();

  /**
   * Select the next visible and selectable node in this tree. Does not expand any nodes.
   */
  void selectNextNode();

  /**
   * Select the first visible and selectable node in this tree. Does not expand any nodes.
   */
  void selectFirstNode();

  /**
   * Select the last visible and selectable node in this tree. Does not expand any nodes.
   */
  void selectLastNode();

  /**
   * Expand current selected node and then select next.
   */
  void selectNextChildNode();

  /**
   * Select parent of current selected node.
   */
  void selectPreviousParentNode();

  /**
   * @return a flat array of all checked nodes
   */
  Set<ITreeNode> getCheckedNodes();

  int getCheckedNodesCount();

  /**
   * Container of this tree, {@link IPage}, {@link ITreeField}, {@link ITreeBox}
   * <p>
   * https://bugs.eclipse.org/bugs/show_bug.cgi?id=388227
   *
   * @since 3.8.1
   */
  Object getContainer();

  /**
   * @return true if parent is equal to child or parent is an ancestor of child
   * @since 03.07.2009
   */
  boolean isAncestorNodeOf(ITreeNode parent, ITreeNode child);

  /**
   * Accessor to the tree listener registry
   */
  TreeListeners treeListeners();

  /**
   * @param listener
   * @param eventTypes
   *          of {@link TreeEvent} TYPE_*
   */
  default void addTreeListener(TreeListener listener, Integer... eventTypes) {
    treeListeners().add(listener, false, eventTypes);
  }

  default void removeTreeListener(TreeListener listener, Integer... eventTypes) {
    treeListeners().remove(listener, eventTypes);
  }

  /**
   * Add the listener so it is called as <em>last</em> listener
   * <p>
   * Use {@link #addTreeListener(TreeListener)} in all other cases
   *
   * @param listener
   * @param eventTypes
   *          of {@link TreeEvent} TYPE_*
   */
  default void addUITreeListener(TreeListener listener, Integer... eventTypes) {
    treeListeners().addLastCalled(listener, false, eventTypes);
  }

  /**
   * @return the {@link IEventHistory} associated with this tree
   *         <p>
   *         The default implementation is a {@link DefaultTreeEventHistory} and created by
   *         {@link AbstractTree#createEventHistory()}
   *         <p>
   *         This method is thread safe.
   * @since 3.8
   */
  IEventHistory<TreeEvent> getEventHistory();

  /**
   * <b>Please note:</b> Multi-select is not supported by the HTML UI yet. Multiple nodes can be selected
   * programmatically using {@link #selectNodes(Collection, boolean)}.
   *
   * @return {@code true} if multiple nodes can be selected (default {@code false}).
   */
  boolean isMultiSelect();

  /**
   * <b>Please note:</b> Multi-select is not supported by the HTML UI yet. Multiple nodes can be selected
   * programmatically using {@link #selectNodes(Collection, boolean)}.
   *
   * @param b
   *          {@code true} if it should be possible to select multiple nodes. {@code false} otherwise.
   */
  void setMultiSelect(boolean b);

  /**
   * true if multiple nodes can be checked (default true)
   */
  boolean isMultiCheck();

  void setMultiCheck(boolean b);

  boolean isCheckable();

  void setCheckable(boolean b);

  /**
   * This is a hint for the UI if it is not capable of having variable node height based on node contents (such as
   * rap/rwt).
   * <p>
   * This hint defines the node height in pixels being used as the fixed node height for all nodes of this tree.
   *
   * @return the hint in pixels, default is -1
   */
  int getNodeHeightHint();

  /**
   * see {@link #getNodeHeightHint()}
   */
  void setNodeHeightHint(int h);

  boolean isAutoDiscardOnDelete();

  void setAutoDiscardOnDelete(boolean on);

  boolean isTreeChanging();

  void setTreeChanging(boolean b);

  boolean isNodeExpanded(ITreeNode node);

  void setNodeExpanded(ITreeNode node, boolean expanded);

  /**
   * @param node
   * @param expanded
   * @param lazy
   *          true to expand the node lazily, false if not. Only has an effect if the expanded is set to true, see also
   *          {@link ITreeNode#isExpandedLazy()}
   */
  void setNodeExpanded(ITreeNode node, boolean expanded, boolean lazy);

  /**
   * set expanded without check if node is already expanded
   */
  void setNodeExpandedInternal(ITreeNode node, boolean expanded, boolean lazy);

  void setNodeEnabledPermission(ITreeNode node, Permission p);

  boolean isNodeEnabled(ITreeNode node);

  void setNodeEnabled(ITreeNode node, boolean b);

  boolean isNodeEnabledGranted(ITreeNode node);

  void setNodeEnabledGranted(ITreeNode node, boolean b);

  void setNodeVisiblePermission(ITreeNode node, Permission p);

  boolean isNodeVisible(ITreeNode node);

  void setNodeVisible(ITreeNode node, boolean b);

  boolean isNodeVisibleGranted(ITreeNode node);

  void setNodeVisibleGranted(ITreeNode node, boolean b);

  boolean isNodeLeaf(ITreeNode node);

  void setNodeLeaf(ITreeNode node, boolean b);

  void setNodeChecked(ITreeNode node, boolean checked);

  void setNodeChecked(ITreeNode node, boolean checked, boolean enabledNodesOnly);

  void setNodesChecked(List<ITreeNode> nodes, boolean checked);

  void setNodesChecked(List<ITreeNode> nodes, boolean checked, boolean enabledNodesOnly);

  boolean isNodeChecked(ITreeNode node);

  int getNodeStatus(ITreeNode node);

  void setNodeStatus(ITreeNode node, int status);

  List<IKeyStroke> getKeyStrokes();

  void setKeyStrokes(List<? extends IKeyStroke> keyStrokes);

  /*
   * modifications
   */

  /**
   * append a child node to the end of the children of parent
   */
  void addChildNode(ITreeNode parent, ITreeNode child);

  /**
   * append a list of child nodes or a complete subtree to the end of the children of parent
   */
  void addChildNodes(ITreeNode parent, List<? extends ITreeNode> children);

  void addChildNode(int startIndex, ITreeNode parent, ITreeNode child);

  void addChildNodes(int startIndex, ITreeNode parent, List<? extends ITreeNode> children);

  void updateNode(ITreeNode node);

  void updateChildNodes(ITreeNode parent, Collection<? extends ITreeNode> children);

  void updateChildNodeOrder(ITreeNode parent, List<? extends ITreeNode> newChildren);

  void removeChildNode(ITreeNode parent, ITreeNode child);

  void removeChildNodes(ITreeNode parent, Collection<? extends ITreeNode> children);

  void removeAllChildNodes(ITreeNode parent);

  void removeNode(ITreeNode node);

  /**
   * Clears removed nodes from cache and disposes them.
   */
  void clearDeletedNodes();

  /**
   * Clears a specific (already deleted) node from cache and disposes it.
   */
  void disposeDeletedNode(ITreeNode node);

  /**
   * Clears specific (already deleted) nodes from cache and disposes them.
   */
  void disposeDeletedNodes(Collection<ITreeNode> nodes);

  /**
   * Removes a node from deleted nodes (does not discard it, it might be re-used afterwards).
   */
  void discardDeletedNode(ITreeNode node);

  /**
   * Removes nodes from deleted nodes (does not discard them, they might be re-used afterwards).
   */
  void discardDeletedNodes(Collection<ITreeNode> node);

  int getDeletedNodeCount();

  Set<ITreeNode> getDeletedNodes();

  int getInsertedNodeCount();

  Set<ITreeNode> getInsertedNodes();

  int getUpdatedNodeCount();

  Set<ITreeNode> getUpdatedNodes();

  TreeVisitResult visitTree(IDepthFirstTreeVisitor<ITreeNode> v);

  TreeVisitResult visitVisibleTree(IDepthFirstTreeVisitor<ITreeNode> v);

  TreeVisitResult visitNode(ITreeNode node, IDepthFirstTreeVisitor<ITreeNode> v);

  /**
   * unload all children and mark node as not loaded
   */
  void unloadNode(ITreeNode node);

  /**
   * extract transfer data to be sent to the backend
   * <p>
   * The single root node is not exported, the export starts with the first level after the root node
   */
  void exportTreeData(AbstractTreeFieldData target);

  /**
   * apply transfer data to this tree
   * <p>
   * All nodes are imported starting under the (existing) root node
   */
  void importTreeData(AbstractTreeFieldData source);

  /*
   * UI Processes
   */
  ITreeUIFacade getUIFacade();

  /**
   * @return if {@code true}, the attached UI will save or restore its horizontal and vertical coordinates of its
   *         scrollbars.
   */
  boolean isSaveAndRestoreScrollbars();

  /**
   * @param b
   *          {@code true} advices the attached UI to save or restore its horizontal and vertical coordinates of its
   *          scrollbars.
   */
  void setSaveAndRestoreScrollbars(boolean b);

  String getDisplayStyle();

  /**
   * @see {@link #DISPLAY_STYLE_DEFAULT}, {@link #DISPLAY_STYLE_BREADCRUMB}
   */
  void setDisplayStyle(String style);

  boolean isToggleBreadcrumbStyleEnabled();

  void setToggleBreadcrumbStyleEnabled(boolean b);

  /**
   * informs the attached UI that a node has changed in a way that may affect its presentation (e.g. text, font,
   * color...) but no structural changes occurred
   *
   * @param abstractTreeNode
   * @since 3.10.0-M5
   */
  void fireNodeChanged(ITreeNode abstractTreeNode);
}
