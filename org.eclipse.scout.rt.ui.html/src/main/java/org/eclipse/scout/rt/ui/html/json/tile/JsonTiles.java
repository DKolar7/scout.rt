package org.eclipse.scout.rt.ui.html.json.tile;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.rt.client.ui.action.menu.root.IContextMenu;
import org.eclipse.scout.rt.client.ui.tile.ITile;
import org.eclipse.scout.rt.client.ui.tile.ITiles;
import org.eclipse.scout.rt.client.ui.tile.TilesLayoutConfig;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.AbstractJsonWidget;
import org.eclipse.scout.rt.ui.html.json.FilteredJsonAdapterIds;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonAdapterProperty;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonAdapterPropertyConfig;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonAdapterPropertyConfigBuilder;
import org.eclipse.scout.rt.ui.html.json.menu.IJsonContextMenuOwner;
import org.eclipse.scout.rt.ui.html.json.menu.JsonContextMenu;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * @since 7.1
 */
public class JsonTiles<T extends ITiles<? extends ITile>> extends AbstractJsonWidget<T> implements IJsonContextMenuOwner {

  private JsonContextMenu<IContextMenu> m_jsonContextMenu;

  public JsonTiles(T model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "Tiles";
  }

  @Override
  protected void attachChildAdapters() {
    super.attachChildAdapters();
    m_jsonContextMenu = new JsonContextMenu<>(getModel().getContextMenu(), this);
    m_jsonContextMenu.init();
  }

  @Override
  protected void disposeChildAdapters() {
    getJsonContextMenu().dispose();
    super.disposeChildAdapters();
  }

  @Override
  protected void initJsonProperties(T model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonAdapterProperty<T>(ITiles.PROP_TILES, model, getUiSession()) {
      @Override
      protected List<? extends ITile> modelValue() {
        return getModel().getTiles();
      }
    });
    putJsonProperty(new JsonAdapterProperty<T>(ITiles.PROP_SELECTED_TILES, model, getUiSession()) {
      @Override
      protected List<? extends ITile> modelValue() {
        return getModel().getSelectedTiles();
      }

      @Override
      protected JsonAdapterPropertyConfig createConfig() {
        return new JsonAdapterPropertyConfigBuilder().disposeOnChange(false).build();
      }
    });
    putJsonProperty(new JsonAdapterProperty<T>(ITiles.PROP_FILTERED_TILES, model, getUiSession()) {
      @Override
      protected List<? extends ITile> modelValue() {
        return getModel().getFilteredTiles();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        if (getModel().getFilters().size() == 0) {
          // If no filter is active return null instead of an array which contains the same content as the tiles array
          return null;
        }
        return super.prepareValueForToJson(value);
      }

      @Override
      protected JsonAdapterPropertyConfig createConfig() {
        return new JsonAdapterPropertyConfigBuilder().disposeOnChange(false).build();
      }
    });
    putJsonProperty(new JsonProperty<ITiles>(ITiles.PROP_GRID_COLUMN_COUNT, model) {
      @Override
      protected Integer modelValue() {
        return getModel().getGridColumnCount();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_SELECTABLE, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isSelectable();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_MULTI_SELECT, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isMultiSelect();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_WITH_PLACEHOLDERS, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isWithPlaceholders();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_SCROLLABLE, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isScrollable();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_LOGICAL_GRID, model) {
      @Override
      protected String modelValue() {
        return getModel().getLogicalGrid();
      }
    });
    putJsonProperty(new JsonProperty<T>(ITiles.PROP_LAYOUT_CONFIG, model) {
      @Override
      protected TilesLayoutConfig modelValue() {
        return getModel().getLayoutConfig();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        return new JsonTilesLayoutConfig((TilesLayoutConfig) value).toJson();
      }
    });
  }

  @Override
  public JSONObject toJson() {
    JSONObject json = super.toJson();
    json.put(PROP_MENUS, getJsonContextMenu().childActionsToJson());
    return json;
  }

  @SuppressWarnings("unchecked")
  @Override
  protected void handleUiPropertyChange(String propertyName, JSONObject data) {
    if (ITiles.PROP_SELECTED_TILES.equals(propertyName)) {
      List<ITile> tiles = extractTiles(data);
      addPropertyEventFilterCondition(ITiles.PROP_SELECTED_TILES, tiles);
      getModel().getUIFacade().setSelectedTilesFromUI(tiles);
    }
    else {
      super.handleUiPropertyChange(propertyName, data);
    }
  }

  protected List<ITile> extractTiles(JSONObject json) {
    JSONArray tileIds = json.getJSONArray(ITiles.PROP_SELECTED_TILES);
    List<ITile> tiles = new ArrayList<ITile>(tileIds.length());
    for (int i = 0; i < tileIds.length(); i++) {
      String tileId = tileIds.getString(i);
      Object model = getUiSession().getJsonAdapter(tileId).getModel();
      if (!(model instanceof ITile)) {
        throw new IllegalStateException("Id does not belong to a tile. Id: " + tileId);
      }
      tiles.add((ITile) model);
    }
    return tiles;
  }

  @Override
  public void handleModelContextMenuChanged(FilteredJsonAdapterIds<?> filteredAdapters) {
    addPropertyChangeEvent(PROP_MENUS, filteredAdapters);
  }

  public JsonContextMenu<IContextMenu> getJsonContextMenu() {
    return m_jsonContextMenu;
  }
}
