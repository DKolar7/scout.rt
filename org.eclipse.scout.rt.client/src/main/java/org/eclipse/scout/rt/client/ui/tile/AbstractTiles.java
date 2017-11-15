package org.eclipse.scout.rt.client.ui.tile;

import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.scout.rt.client.ModelContextProxy;
import org.eclipse.scout.rt.client.ModelContextProxy.ModelContext;
import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.client.extension.ui.action.tree.MoveActionNodesHandler;
import org.eclipse.scout.rt.client.extension.ui.tile.ITilesExtension;
import org.eclipse.scout.rt.client.extension.ui.tile.TilesChains.TilesSelectedChain;
import org.eclipse.scout.rt.client.ui.AbstractWidget;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.MenuUtility;
import org.eclipse.scout.rt.client.ui.action.menu.root.ITilesContextMenu;
import org.eclipse.scout.rt.client.ui.action.menu.root.internal.TilesContextMenu;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.annotations.ConfigOperation;
import org.eclipse.scout.rt.platform.annotations.ConfigProperty;
import org.eclipse.scout.rt.platform.classid.ClassId;
import org.eclipse.scout.rt.platform.classid.ITypeWithClassId;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.job.JobInput;
import org.eclipse.scout.rt.platform.job.Jobs;
import org.eclipse.scout.rt.platform.reflect.ConfigurationUtility;
import org.eclipse.scout.rt.platform.util.CollectionUtility;
import org.eclipse.scout.rt.platform.util.ObjectUtility;
import org.eclipse.scout.rt.platform.util.collection.OrderedCollection;
import org.eclipse.scout.rt.shared.extension.AbstractExtension;
import org.eclipse.scout.rt.shared.extension.ContributionComposite;
import org.eclipse.scout.rt.shared.extension.IExtension;
import org.eclipse.scout.rt.shared.extension.ObjectExtensions;

/**
 * @since 7.1
 */
@ClassId("c04e6cf7-fda0-4146-afea-6a0ff0a50c4b")
public abstract class AbstractTiles extends AbstractWidget implements ITiles {
  private ITilesUIFacade m_uiFacade;
  private boolean m_initialized;
  private final ObjectExtensions<AbstractTiles, ITilesExtension<? extends AbstractTiles>> m_objectExtensions;
  private ContributionComposite m_contributionHolder;
  private List<ITileFilter> m_filters;
  private boolean m_filteredRowsDirty = false;

  public AbstractTiles() {
    this(true);
  }

  public AbstractTiles(boolean callInitializer) {
    super(false);
    m_objectExtensions = new ObjectExtensions<>(this, false);
    m_filters = new ArrayList<>(1);
    if (callInitializer) {
      callInitializer();
    }
  }

  @Override
  protected void callInitializer() {
    if (isInitialized()) {
      return;
    }
    interceptInitConfig();
    setInitialized(true);
  }

  protected final void interceptInitConfig() {
    m_objectExtensions.initConfigAndBackupExtensionContext(createLocalExtension(), this::initConfig);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    m_uiFacade = BEANS.get(ModelContextProxy.class).newProxy(createUIFacade(), ModelContext.copyCurrent());
    m_contributionHolder = new ContributionComposite(this);
    setGridColumnCount(getConfiguredGridColumnCount());
    setLogicalGrid(getConfiguredLogicalGrid());
    setLogicalGridColumnWidth(getConfiguredLogicalGridColumnWidth());
    setLogicalGridRowHeight(getConfiguredLogicalGridRowHeight());
    setLogicalGridHGap(getConfiguredLogicalGridHGap());
    setLogicalGridVGap(getConfiguredLogicalGridVGap());
    // getConfiguredMaxContentWidth should not be moved up so that calculatePreferredWidth may be used inside getConfiguredMaxContentWidth()
    setMaxContentWidth(getConfiguredMaxContentWidth());
    setMultiSelect(getConfiguredMultiSelect());
    setSelectable(getConfiguredSelectable());
    setScrollable(getConfiguredScrollable());
    setWithPlaceholders(getConfiguredWithPlaceholders());

    OrderedCollection<ITile> tiles = new OrderedCollection<>();
    injectTilesInternal(tiles);
    setSelectedTiles(new ArrayList<>());
    setFilteredTiles(new ArrayList<>());
    setTiles(tiles.getOrderedList());
    initMenus();

    // local property observer
    addPropertyChangeListener(new P_PropertyChangeListener());
  }

  protected void initMenus() {
    List<Class<? extends IMenu>> ma = getDeclaredMenus();
    OrderedCollection<IMenu> menus = new OrderedCollection<>();
    for (Class<? extends IMenu> clazz : ma) {
      IMenu menu = ConfigurationUtility.newInnerInstance(this, clazz);
      menus.addOrdered(menu);
    }
    List<IMenu> contributedMenus = m_contributionHolder.getContributionsByClass(IMenu.class);
    menus.addAllOrdered(contributedMenus);
    injectMenusInternal(menus);

    // set container on menus
    for (IMenu menu : menus) {
      menu.setContainerInternal(this);
    }

    new MoveActionNodesHandler<>(menus).moveModelObjects();
    ITilesContextMenu contextMenu = new TilesContextMenu(this, menus.getOrderedList());
    setContextMenu(contextMenu);
  }

  public boolean isInitialized() {
    return m_initialized;
  }

  protected void setInitialized(boolean initialized) {
    m_initialized = initialized;
  }

  protected void injectTilesInternal(OrderedCollection<ITile> tiles) {
    List<Class<? extends ITile>> tileClasses = getConfiguredTiles();
    for (Class<? extends ITile> tileClass : tileClasses) {
      ITile tile = createTileInternal(tileClass);
      if (tile != null) {
        tiles.addOrdered(tile);
      }
    }
  }

  protected ITile createTileInternal(Class<? extends ITile> tileClass) {
    return ConfigurationUtility.newInnerInstance(this, tileClass);
  }

  protected List<Class<? extends ITile>> getConfiguredTiles() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    List<Class<ITile>> filtered = ConfigurationUtility.filterClasses(dca, ITile.class);
    return ConfigurationUtility.removeReplacedClasses(filtered);
  }

  /**
   * Override this internal method only in order to make use of dynamic menus<br>
   * Used to manage menu list and add/remove menus.<br>
   * To change the order or specify the insert position use {@link IMenu#setOrder(double)}.
   *
   * @param menus
   *          live and mutable collection of configured menus
   */
  protected void injectMenusInternal(OrderedCollection<IMenu> menus) {
  }

  protected List<Class<? extends IMenu>> getDeclaredMenus() {
    Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
    List<Class<IMenu>> filtered = ConfigurationUtility.filterClasses(dca, IMenu.class);
    return ConfigurationUtility.removeReplacedClasses(filtered);
  }

  @Override
  public void setMenus(List<? extends IMenu> menus) {
    getContextMenu().setChildActions(menus);
  }

  protected void setContextMenu(ITilesContextMenu contextMenu) {
    propertySupport.setProperty(PROP_CONTEXT_MENU, contextMenu);
  }

  @Override
  public ITilesContextMenu getContextMenu() {
    return (ITilesContextMenu) propertySupport.getProperty(PROP_CONTEXT_MENU);
  }

  @Override
  public List<IMenu> getMenus() {
    return getContextMenu().getChildActions();
  }

  @Override
  public <T extends IMenu> T getMenuByClass(Class<T> menuType) {
    return MenuUtility.getMenuByClass(this, menuType);
  }

  protected ITilesUIFacade createUIFacade() {
    return new P_TilesUIFacade();
  }

  @Override
  public ITilesUIFacade getUIFacade() {
    return m_uiFacade;
  }

  @Override
  public void initTiles() {
    for (ITile tile : getTilesInternal()) {
      tile.init();
    }
  }

  @Override
  public void postInitTilesConfig() {
    for (ITile tile : getTilesInternal()) {
      tile.postInitConfig();
    }
  }

  @Override
  public void disposeTiles() {
    for (ITile tile : getTilesInternal()) {
      tile.dispose();
    }
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(5)
  protected int getConfiguredGridColumnCount() {
    return 4;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(8)
  protected String getConfiguredLogicalGrid() {
    return LOGICAL_GRID_HORIZONTAL;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(10)
  protected int getConfiguredLogicalGridColumnWidth() {
    return 200;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(15)
  protected int getConfiguredLogicalGridRowHeight() {
    return 150;
  }

  /**
   * Configures the gap between two logical grid columns.
   */
  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(20)
  protected int getConfiguredLogicalGridHGap() {
    return 15;
  }

  /**
   * Configures the gap between two logical grid rows.
   */
  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(25)
  protected int getConfiguredLogicalGridVGap() {
    return 20;
  }

  /**
   * Configures the maximum width in pixels to use for the content. The maximum is disabled if this value is
   * <code>&lt;= 0</code>.
   * <p>
   * You may use {@link #calculatePreferredWidth()} if you want to limit the width based on the column count, column
   * width and column gap.
   */
  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(290)
  protected int getConfiguredMaxContentWidth() {
    return -1;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(30)
  protected boolean getConfiguredWithPlaceholders() {
    return false;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(40)
  protected boolean getConfiguredSelectable() {
    return false;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(50)
  protected boolean getConfiguredMultiSelect() {
    return true;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(60)
  protected boolean getConfiguredScrollable() {
    return true;
  }

  @Override
  public List<? extends ITile> getTiles() {
    return CollectionUtility.arrayList(propertySupport.getPropertyList(PROP_TILES));
  }

  @Override
  public int getTileCount() {
    return getTilesInternal().size();
  }

  /**
   * @return the live list of the tiles
   */
  protected List<? extends ITile> getTilesInternal() {
    return propertySupport.getPropertyList(PROP_TILES);
  }

  @Override
  public void setTiles(List<? extends ITile> tiles) {
    if (CollectionUtility.equalsCollection(getTilesInternal(), tiles, true)) {
      return;
    }
    List<? extends ITile> existingTiles = ObjectUtility.nvl(getTilesInternal(), new ArrayList<>());
    tiles = ObjectUtility.nvl(tiles, new ArrayList<>());

    // Dispose old tiles (only if they are not in the new list)
    List<ITile> tilesToDelete = new ArrayList<ITile>(existingTiles);
    tilesToDelete.removeAll(tiles);
    for (ITile tile : tilesToDelete) {
      tile.dispose();
    }
    deselectTiles(tilesToDelete);

    // Initialize new tiles
    // Only initialize when tiles are added later,
    // if they are added while initConfig runs, initTiles() will take care of the initialization which will be called by the container (e.g. TilesField)
    List<ITile> tilesToInsert = new ArrayList<ITile>(tiles);
    tilesToInsert.removeAll(existingTiles);
    for (ITile tile : tilesToInsert) {
      tile.setContainer(this);
      if (isInitialized()) {
        tile.postInitConfig();
        tile.init();
      }
    }

    propertySupport.setPropertyList(PROP_TILES, tiles);

    m_filteredRowsDirty = true;
    applyFilters(tilesToInsert);
  }

  @Override
  public void addTiles(List<? extends ITile> tilesToAdd) {
    List<ITile> tiles = new ArrayList<>(getTilesInternal());
    tiles.addAll(tilesToAdd);
    setTiles(tiles);
  }

  @Override
  public void addTile(ITile tile) {
    addTiles(CollectionUtility.arrayList(tile));
  }

  @Override
  public void deleteTiles(List<? extends ITile> tilesToDelete) {
    List<ITile> tiles = new ArrayList<>(getTilesInternal());
    tiles.removeAll(tilesToDelete);
    setTiles(tiles);
  }

  @Override
  public void deleteTile(ITile tile) {
    deleteTiles(CollectionUtility.arrayList(tile));
  }

  @Override
  public void deleteAllTiles() {
    setTiles(new ArrayList<ITile>());
  }

  @Override
  public int getGridColumnCount() {
    return propertySupport.getPropertyInt(PROP_GRID_COLUMN_COUNT);
  }

  @Override
  public void setGridColumnCount(int gridColumnCount) {
    propertySupport.setPropertyInt(PROP_GRID_COLUMN_COUNT, gridColumnCount);
  }

  @Override
  public boolean isWithPlaceholders() {
    return propertySupport.getPropertyBool(PROP_WITH_PLACEHOLDERS);
  }

  @Override
  public void setWithPlaceholders(boolean withPlaceholders) {
    propertySupport.setPropertyBool(PROP_WITH_PLACEHOLDERS, withPlaceholders);
  }

  @Override
  public boolean isSelectable() {
    return propertySupport.getPropertyBool(PROP_SELECTABLE);
  }

  @Override
  public void setSelectable(boolean selectable) {
    propertySupport.setPropertyBool(PROP_SELECTABLE, selectable);
  }

  @Override
  public boolean isMultiSelect() {
    return propertySupport.getPropertyBool(PROP_MULTI_SELECT);
  }

  @Override
  public void setMultiSelect(boolean multiSelect) {
    propertySupport.setPropertyBool(PROP_MULTI_SELECT, multiSelect);
  }

  @Override
  public boolean isScrollable() {
    return propertySupport.getPropertyBool(PROP_SCROLLABLE);
  }

  @Override
  public void setScrollable(boolean scrollable) {
    propertySupport.setPropertyBool(PROP_SCROLLABLE, scrollable);
  }

  @Override
  public String getLogicalGrid() {
    return propertySupport.getPropertyString(PROP_LOGICAL_GRID);
  }

  @Override
  public void setLogicalGrid(String logicalGrid) {
    propertySupport.setPropertyString(PROP_LOGICAL_GRID, logicalGrid);
  }

  @Override
  public int getLogicalGridColumnWidth() {
    return propertySupport.getPropertyInt(PROP_LOGICAL_GRID_COLUMN_WIDTH);
  }

  @Override
  public void setLogicalGridColumnWidth(int logicalGridColumnWidth) {
    propertySupport.setPropertyInt(PROP_LOGICAL_GRID_COLUMN_WIDTH, logicalGridColumnWidth);
  }

  @Override
  public int getLogicalGridRowHeight() {
    return propertySupport.getPropertyInt(PROP_LOGICAL_GRID_ROW_HEIGHT);
  }

  @Override
  public void setLogicalGridRowHeight(int logicalGridRowHeight) {
    propertySupport.setPropertyInt(PROP_LOGICAL_GRID_ROW_HEIGHT, logicalGridRowHeight);
  }

  @Override
  public int getLogicalGridHGap() {
    return propertySupport.getPropertyInt(PROP_LOGICAL_GRID_H_GAP);
  }

  @Override
  public void setLogicalGridHGap(int logicalGridGap) {
    propertySupport.setPropertyInt(PROP_LOGICAL_GRID_H_GAP, logicalGridGap);
  }

  @Override
  public int getLogicalGridVGap() {
    return propertySupport.getPropertyInt(PROP_LOGICAL_GRID_V_GAP);
  }

  @Override
  public void setLogicalGridVGap(int logicalGridGap) {
    propertySupport.setPropertyInt(PROP_LOGICAL_GRID_V_GAP, logicalGridGap);
  }

  @Override
  public int getMaxContentWidth() {
    return propertySupport.getPropertyInt(PROP_MAX_CONTENT_WIDTH);
  }

  @Override
  public void setMaxContentWidth(int maxContentWidth) {
    propertySupport.setPropertyInt(PROP_MAX_CONTENT_WIDTH, maxContentWidth);
  }

  /**
   * @returns the preferred width based on grid column count, column width and horizontal gap. Typically used to set the
   *          max content width.
   */
  protected int calculatePreferredWidth() {
    return getGridColumnCount() * getLogicalGridColumnWidth() + (getGridColumnCount() - 1) * getLogicalGridHGap();
  }

  /**
   * Called whenever the selection changes.
   * <p>
   * Subclasses can override this method. The default does nothing.
   *
   * @param tiles
   *          an unmodifiable list of the selected tiles, may be empty but not null.
   */
  @ConfigOperation
  @Order(100)
  protected void execTilesSelected(List<? extends ITile> tiles) {
  }

  @Override
  public void selectTiles(List<? extends ITile> tiles) {
    if (!isSelectable()) {
      setSelectedTiles(new ArrayList<>());
      return;
    }

    List<ITile> newSelection = filterTiles(tiles);
    if (newSelection.size() > 1 && !isMultiSelect()) {
      ITile first = newSelection.get(0);
      newSelection.clear();
      newSelection.add(first);
    }
    if (!CollectionUtility.equalsCollection(getSelectedTilesInternal(), newSelection, false)) {
      setSelectedTiles(newSelection);
    }
  }

  @Override
  public void selectTile(ITile tile) {
    selectTiles(CollectionUtility.arrayList(tile));
  }

  @Override
  public void selectAllTiles() {
    selectTiles(getTilesInternal());
  }

  @Override
  public void deselectTiles(List<? extends ITile> tiles) {
    List<? extends ITile> selectedTiles = getSelectedTiles();
    boolean selectionChanged = selectedTiles.removeAll(tiles);
    if (selectionChanged) {
      selectTiles(selectedTiles);
    }
  }

  @Override
  public void deselectTile(ITile tile) {
    deselectTiles(CollectionUtility.arrayList(tile));
  }

  @Override
  public void deselectAllTiles() {
    selectTiles(new ArrayList<ITile>());
  }

  @Override
  public List<? extends ITile> getSelectedTiles() {
    return CollectionUtility.arrayList(propertySupport.getPropertyList(PROP_SELECTED_TILES));
  }

  /**
   * @return the live list of the selected tiles
   */
  protected List<? extends ITile> getSelectedTilesInternal() {
    return propertySupport.getPropertyList(PROP_SELECTED_TILES);
  }

  @Override
  public int getSelectedTileCount() {
    return getSelectedTilesInternal().size();
  }

  protected void setSelectedTiles(List<? extends ITile> tiles) {
    propertySupport.setPropertyList(PROP_SELECTED_TILES, tiles);
  }

  @Override
  public ITile getSelectedTile() {
    if (getSelectedTileCount() == 0) {
      return null;
    }
    return getSelectedTiles().get(0);
  }

  @Override
  public String classId() {
    String simpleClassId = ConfigurationUtility.getAnnotatedClassIdWithFallback(getClass());
    if (getContainer() != null) {
      return simpleClassId + ID_CONCAT_SYMBOL + getContainer().classId();
    }
    return simpleClassId;
  }

  @Override
  public <T extends ITile> T getTileByClass(Class<T> tileClass) {
    // TODO [15.4] bsh: Make this method more sophisticated (@Replace etc.)
    T candidate = null;
    for (ITile tile : getTilesInternal()) {
      if (tile.getClass() == tileClass) {
        return tileClass.cast(tile);
      }
      if (candidate == null && tileClass.isInstance(tile)) {
        candidate = tileClass.cast(tile);
      }
    }
    return candidate;
  }

  @Override
  public ITypeWithClassId getContainer() {
    return (ITypeWithClassId) propertySupport.getProperty(PROP_CONTAINER);
  }

  /**
   * do not use this internal method unless you are implementing a container that holds and controls tiles.
   */
  public void setContainerInternal(ITypeWithClassId container) {
    propertySupport.setProperty(PROP_CONTAINER, container);
  }

  protected String getAsyncLoadIdentifier() {
    return null;
  }

  protected String getWindowIdentifier() {
    return null;
  }

  @Override
  public JobInput createAsyncLoadJobInput(ITile tile) {
    return Jobs.newInput()
        .withRunContext(ClientRunContexts.copyCurrent().withProperty(PROP_RUN_CONTEXT_TILE, tile))
        .withName(PROP_ASYNC_LOAD_JOBNAME_PREFIX)
        .withExecutionHint(PROP_ASYNC_LOAD_IDENTIFIER_PREFIX + getAsyncLoadIdentifier())
        .withExecutionHint(PROP_WINDOW_IDENTIFIER_PREFIX + getWindowIdentifier());
  }

  @Override
  public void ensureTileDataLoaded() {
    BEANS.get(TileDataLoadManager.class).cancel(getAsyncLoadIdentifier(), getWindowIdentifier());

    for (ITile tile : getTilesInternal()) {
      tile.ensureDataLoaded();
    }
  }

  @Override
  public void loadTileData() {
    BEANS.get(TileDataLoadManager.class).cancel(getAsyncLoadIdentifier(), getWindowIdentifier());

    for (ITile tile : getTilesInternal()) {
      tile.loadData();
    }
  }

  @Override
  public List<ITileFilter> getFilters() {
    return CollectionUtility.arrayList(m_filters);
  }

  @Override
  public void addFilter(ITileFilter filter, boolean applyFilters) {
    if (filter == null || m_filters.contains(filter)) {
      return;
    }
    m_filters.add(filter);
    if (applyFilters) {
      filter();
    }
  }

  @Override
  public void addFilter(ITileFilter filter) {
    addFilter(filter, true);
  }

  @Override
  public void removeFilter(ITileFilter filter, boolean applyFilters) {
    if (filter != null && m_filters.remove(filter) && applyFilters) {
      filter();
    }
  }

  @Override
  public void removeFilter(ITileFilter filter) {
    removeFilter(filter, true);
  }

  @Override
  public void filter() {
    // Full reset is set to true to loop through every tile and make sure tile.filterAccepted is correctly set
    applyFilters(true);
  }

  protected boolean applyFilters() {
    return applyFilters(getTilesInternal(), false);
  }

  protected boolean applyFilters(boolean fullReset) {
    return applyFilters(getTilesInternal(), fullReset);
  }

  protected boolean applyFilters(List<? extends ITile> tiles) {
    return applyFilters(tiles, false);
  }

  protected boolean applyFilters(List<? extends ITile> tiles, boolean fullReset) {
    if (m_filters.size() == 0 && !fullReset) {
      setFilteredTiles(getTilesInternal());
      m_filteredRowsDirty = false;
      return false;
    }
    boolean filterChanged = false;
    List<ITile> newlyHiddenTiles = new ArrayList<>();
    for (ITile tile : tiles) {
      boolean wasFilterAccepted = tile.isFilterAccepted();
      applyFilters(tile);
      if (tile.isFilterAccepted() != wasFilterAccepted) {
        filterChanged = true;
      }
      if (filterChanged && !tile.isFilterAccepted()) {
        newlyHiddenTiles.add(tile);
      }
    }

    // Non visible tiles must be deselected
    deselectTiles(newlyHiddenTiles);

    if (filterChanged || m_filteredRowsDirty) {
      setFilteredTiles(filterTiles(getTilesInternal()));
      m_filteredRowsDirty = false;
    }

    return filterChanged;
  }

  protected void applyFilters(ITile tile) {
    tile.setFilterAccepted(true);
    for (ITileFilter filter : m_filters) {
      if (!filter.accept(tile)) {
        tile.setFilterAccepted(false);
      }
    }
  }

  @Override
  public List<? extends ITile> getFilteredTiles() {
    return propertySupport.getPropertyList(PROP_FILTERED_TILES);
  }

  protected void setFilteredTiles(List<? extends ITile> tiles) {
    propertySupport.setPropertyList(PROP_FILTERED_TILES, tiles);
  }

  @Override
  public int getFilteredTileCount() {
    return getFilteredTiles().size();
  }

  protected List<ITile> filterTiles(List<? extends ITile> tiles) {
    if (m_filters.isEmpty()) {
      return new ArrayList<>(tiles);
    }
    return tiles
        .stream()
        .filter((t) -> t.isFilterAccepted())
        .collect(Collectors.toList());
  }

  protected class P_TilesUIFacade implements ITilesUIFacade {

    @Override
    public void setSelectedTilesFromUI(List<? extends ITile> tiles) {
      selectTiles(tiles);
    }

  }

  @Override
  public final <T> T optContribution(Class<T> contribution) {
    return m_contributionHolder.optContribution(contribution);
  }

  @Override
  public final List<Object> getAllContributions() {
    return m_contributionHolder.getAllContributions();
  }

  @Override
  public final <T> List<T> getContributionsByClass(Class<T> type) {
    return m_contributionHolder.getContributionsByClass(type);
  }

  @Override
  public final <T> T getContribution(Class<T> contribution) {
    return m_contributionHolder.getContribution(contribution);
  }

  @Override
  public final List<? extends ITilesExtension<? extends AbstractTiles>> getAllExtensions() {
    return m_objectExtensions.getAllExtensions();
  }

  @Override
  public <T extends IExtension<?>> T getExtension(Class<T> c) {
    return m_objectExtensions.getExtension(c);
  }

  protected ITilesExtension<? extends AbstractTiles> createLocalExtension() {
    return new LocalTilesExtension<>(this);
  }

  protected static class LocalTilesExtension<TILES extends AbstractTiles> extends AbstractExtension<TILES> implements ITilesExtension<TILES> {

    public LocalTilesExtension(TILES owner) {
      super(owner);
    }

    @Override
    public void execTilesSelected(TilesSelectedChain chain, List<? extends ITile> tiles) {
      getOwner().execTilesSelected(tiles);
    }
  }

  protected final void interceptTilesSelected(List<? extends ITile> tiles) {
    List<? extends ITilesExtension<? extends AbstractTiles>> extensions = getAllExtensions();
    TilesSelectedChain chain = new TilesSelectedChain(extensions);
    chain.execTilesSelected(tiles);
  }

  protected class P_PropertyChangeListener implements PropertyChangeListener {

    @Override
    public void propertyChange(PropertyChangeEvent event) {
      if (event.getPropertyName().equals(PROP_SELECTED_TILES)) {
        @SuppressWarnings("unchecked")
        List<? extends ITile> tiles = (List<? extends ITile>) event.getNewValue();
        try {
          interceptTilesSelected(tiles);
        }
        catch (Exception t) {
          BEANS.get(ExceptionHandler.class).handle(t);
        }
      }
    }
  }

}
