package org.eclipse.scout.rt.ui.html.json.form.fields.smartfield;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.eclipse.scout.rt.client.ui.basic.table.columns.ColumnDescriptor;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.client.ui.form.fields.IValueField;
import org.eclipse.scout.rt.client.ui.form.fields.smartfield2.ISmartField2;
import org.eclipse.scout.rt.client.ui.form.fields.smartfield2.SmartField2Result;
import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.platform.status.IStatus;
import org.eclipse.scout.rt.platform.util.NumberUtility;
import org.eclipse.scout.rt.platform.util.ObjectUtility;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.platform.util.TriState;
import org.eclipse.scout.rt.shared.data.basic.table.AbstractTableRowData;
import org.eclipse.scout.rt.shared.services.lookup.ILookupRow;
import org.eclipse.scout.rt.shared.services.lookup.LookupRow;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.MainJsonObjectFactory;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonValueField;
import org.eclipse.scout.rt.ui.html.res.BinaryResourceUrlUtility;
import org.json.JSONArray;
import org.json.JSONObject;

public class JsonSmartField2<VALUE, MODEL extends ISmartField2<VALUE>> extends JsonValueField<MODEL> {

  // Contains always the mapping from the last performed lookup operation
  // all values are reset each time a new lookup starts
  private Map<Object, Integer> m_keyToIdMap = new HashMap<>();
  private Map<Integer, Object> m_idToKeyMap = new HashMap<>();
  private int m_id = 0;

  public JsonSmartField2(MODEL model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  protected void initJsonProperties(MODEL model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(IValueField.PROP_VALUE, model) {
      @Override
      protected VALUE modelValue() {
        return getModel().getValue();
      }

      @Override
      @SuppressWarnings("unchecked")
      public Object prepareValueForToJson(Object value) {
        return JsonSmartField2.this.valueToJson((VALUE) value);
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_RESULT, model) {
      @Override
      protected Object modelValue() {
        return getModel().getResult();
      }

      @Override
      @SuppressWarnings("unchecked")
      public Object prepareValueForToJson(Object value) {
        return resultToJson((SmartField2Result<VALUE>) value);
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_LOOKUP_ROW, model) {
      @Override
      protected Object modelValue() {
        return getModel().getLookupRow();
      }

      @Override
      @SuppressWarnings("unchecked")
      public Object prepareValueForToJson(Object value) {
        return lookupRowToJson((LookupRow<VALUE>) value, hasMultipleColumns());
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_BROWSE_MAX_ROW_COUNT, model) {
      @Override
      protected Integer modelValue() {
        return getModel().getBrowseMaxRowCount();
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_BROWSE_AUTO_EXPAND_ALL, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isBrowseAutoExpandAll();
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_BROWSE_LOAD_INCREMENTAL, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isBrowseLoadIncremental();
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_ACTIVE_FILTER_ENABLED, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isActiveFilterEnabled();
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_ACTIVE_FILTER, model) {
      @Override
      protected TriState modelValue() {
        return getModel().getActiveFilter();
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_ACTIVE_FILTER_LABELS, model) {
      @Override
      protected String[] modelValue() {
        return getModel().getActiveFilterLabels();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        return new JSONArray(value);
      }
    });
    putJsonProperty(new JsonProperty<ISmartField2<VALUE>>(ISmartField2.PROP_COLUMN_DESCRIPTORS, model) {
      @Override
      protected ColumnDescriptor[] modelValue() {
        return getModel().getColumnDescriptors();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        return columnDescriptorsToJson(value);
      }
    });
  }

  @Override
  public String getObjectType() {
    if (getModel().isMultilineText()) {
      return "SmartField2Multiline";
    }
    else {
      return "SmartField2";
    }
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    if ("lookupByText".equals(event.getType())) {
      handleUiLookupByText(event);
    }
    else if ("lookupAll".equals(event.getType())) {
      handleUiLookupAll();
    }
    else if ("lookupByKey".equals(event.getType())) {
      handleUiLookupByKey(event);
    }
    else if ("lookupByRec".equals(event.getType())) {
      handleUiLookupByRec(event);
    }
    else {
      super.handleUiEvent(event);
    }
  }

  @Override
  protected void handleUiAcceptInput(JsonEvent event) {
    JSONObject data = event.getData();
    boolean valueSet = false;
    VALUE valueFromUi = null;

    // When we have a lookup row, we prefer the lookup row over the value
    if (data.has(ISmartField2.PROP_LOOKUP_ROW)) {
      valueFromUi = valueFromJsonLookupRow(data);
      handleUiLookupRowChange(data);
      valueSet = true;
    }
    else if (data.has(IValueField.PROP_VALUE)) {
      valueFromUi = valueFromJsonValue(data);
      handleUiValueChange(data);
      valueSet = true;
    }

    // In case the model changes its value to something other than what the UI
    // sends, we cannot set display text and error status. This can happen if
    // execValidateValue is overridden.
    if (valueSet) {
      VALUE valueFromModel = getModel().getValue();
      if (!ObjectUtility.equals(valueFromUi, valueFromModel)) {
        addPropertyChangeEvent(ISmartField2.PROP_LOOKUP_ROW, lookupRowToJson((LookupRow<?>) getModel().getLookupRow(), hasMultipleColumns()));
        String displayTextFromModel = getModel().getDisplayText();
        addPropertyChangeEvent(IValueField.PROP_DISPLAY_TEXT, displayTextFromModel);
        return;
      }
    }

    if (data.has(IValueField.PROP_DISPLAY_TEXT)) {
      handleUiDisplayTextChange(data);
    }

    // Don't use error status from UI when value has been set
    if (valueSet) {
      return;
    }

    if (data.has(IValueField.PROP_ERROR_STATUS)) {
      handleUiErrorStatusChange(data);
    }
  }

  @SuppressWarnings("unchecked")
  protected VALUE valueFromJsonValue(JSONObject data) {
    return (VALUE) jsonToValue(data.optString(IValueField.PROP_VALUE));
  }

  protected VALUE valueFromJsonLookupRow(JSONObject data) {
    JSONObject jsonLookupRow = data.optJSONObject(ISmartField2.PROP_LOOKUP_ROW);
    ILookupRow<VALUE> lookupRow = lookupRowFromJson(jsonLookupRow);
    return lookupRow == null ? null : lookupRow.getKey();
  }

  @Override
  protected void handleUiPropertyChange(String propertyName, JSONObject data) {
    if (IValueField.PROP_VALUE.equals(propertyName)) {
      handleUiValueChange(data);
    }
    else if (IValueField.PROP_DISPLAY_TEXT.equals(propertyName)) {
      handleUiDisplayTextChange(data);
    }
    else if (ISmartField2.PROP_LOOKUP_ROW.equals(propertyName)) {
      handleUiLookupRowChange(data);
    }
    else if (ISmartField2.PROP_ACTIVE_FILTER.equals(propertyName)) {
      String activeFilterString = data.optString(ISmartField2.PROP_ACTIVE_FILTER, null);
      TriState activeFilter = TriState.valueOf(activeFilterString);
      addPropertyEventFilterCondition(ISmartField2.PROP_ACTIVE_FILTER, activeFilter);
      getModel().getUIFacade().setActiveFilterFromUI(activeFilter);
    }
    else if (IFormField.PROP_ERROR_STATUS.equals(propertyName)) {
      handleUiErrorStatusChange(data);
    }
    else {
      super.handleUiPropertyChange(propertyName, data);
    }
  }

  @Override
  protected Object jsonToValue(String jsonValue) {
    return getLookupRowKeyForId(jsonValue); // jsonValue == mapped key
  }

  protected Object valueToJson(VALUE value) {
    if (value == null) {
      return value;
    }
    return getIdForLookupRowKey(value);
  }

  @Override
  @SuppressWarnings("unchecked")
  protected void setValueFromUI(Object value) {
    getModel().getUIFacade().setValueFromUI((VALUE) value);
  }

  @Override
  protected void setDisplayTextFromUI(String displayText) {
    getModel().getUIFacade().setDisplayTextFromUI(displayText);
  }

  @Override
  protected void setErrorStatusFromUI(IStatus status) {
    getModel().getUIFacade().setErrorStatusFromUI(status);
  }

  protected void handleUiLookupRowChange(JSONObject data) {
    JSONObject jsonLookupRow = data.optJSONObject(ISmartField2.PROP_LOOKUP_ROW);
    ILookupRow<VALUE> lookupRow = lookupRowFromJson(jsonLookupRow);
    VALUE value = lookupRow == null ? null : lookupRow.getKey();
    addPropertyEventFilterCondition(ISmartField2.PROP_LOOKUP_ROW, lookupRow);
    addPropertyEventFilterCondition(IValueField.PROP_VALUE, value);
    getModel().getUIFacade().setLookupRowFromUI(lookupRow);
  }

  protected void handleUiLookupByText(JsonEvent event) {
    String searchText = event.getData().optString("searchText");
    getModel().lookupByText(searchText);
  }

  protected void handleUiLookupByKey(JsonEvent event) {
    String mappedKey = event.getData().optString("key");
    VALUE key = getLookupRowKeyForId(mappedKey);
    getModel().lookupByKey(key);
  }

  protected void handleUiLookupByRec(JsonEvent event) {
    String mappedParentKey = event.getData().optString("rec");
    VALUE rec = getLookupRowKeyForId(mappedParentKey);
    getModel().lookupByRec(rec);
  }

  /**
   * Why resolve current key and not resolve key with a parameter? Because it is not guaranteed that the key is
   * serializable / comparable. So we cannot simply send the key from the UI to the server. Additionally we do not have
   * a list of lookup rows as we have in lookupByText
   *
   * @param event
   */
  protected void handleUiLookupAll() {
    getModel().lookupAll();
  }

  protected void resetKeyMap() {
    m_keyToIdMap.clear();
    m_idToKeyMap.clear();
    m_id = 0;
  }

  /**
   * Returns a numeric ID for the given lookup row key. If the key is already mapped to an ID the existing ID is
   * returned. Otherwise a new ID is returned.
   *
   * @param key
   * @return
   */
  protected int getIdForLookupRowKey(Object key) {
    if (m_keyToIdMap.containsKey(key)) {
      return m_keyToIdMap.get(key);
    }

    int id = m_id++;
    m_keyToIdMap.put(key, id);
    m_idToKeyMap.put(id, key);
    return id;
  }

  protected boolean hasMultipleColumns() {
    return getModel().getColumnDescriptors() != null;
  }

  @SuppressWarnings("unchecked")
  protected JSONObject resultToJson(SmartField2Result result) {
    if (result == null) {
      return null;
    }
    JSONObject json = new JSONObject();
    JSONArray jsonLookupRows = new JSONArray();
    for (LookupRow<?> lookupRow : (Collection<LookupRow<?>>) result.getLookupRows()) {
      jsonLookupRows.put(lookupRowToJson(lookupRow, hasMultipleColumns()));
    }
    json.put("lookupRows", jsonLookupRows);
    if (result.isByParentKeySearch()) {
      json.put("rec", getIdForLookupRowKey(result.getParentKey()));
    }
    else if (result.isByKeySearch()) {
      json.put("key", getIdForLookupRowKey(result.getKey()));
    }
    else {
      json.put("searchText", result.getSearchText());
    }
    if (result.getException() != null) {
      json.put("exception", exceptionToJson(result.getException()));
    }
    return json;
  }

  protected Object exceptionToJson(Throwable exception) {
    if (exception instanceof PlatformException) {
      return ((PlatformException) exception).getDisplayMessage();
    }
    else {
      return exception.getMessage();
    }
  }

  protected ILookupRow<VALUE> lookupRowFromJson(JSONObject json) {
    if (json == null) {
      return null;
    }

    VALUE lookupRowKey = getLookupRowKeyForId(json.optString("key"));
    String lookupRowText = json.optString("text");
    return createLookupRow(lookupRowKey, lookupRowText, json);
  }

  protected ILookupRow<VALUE> createLookupRow(VALUE key, String text, JSONObject json) {
    LookupRow<VALUE> lookupRow = new LookupRow<VALUE>(key, text);
    if (json.has("enabled")) {
      lookupRow.withEnabled(json.getBoolean("enabled"));
    }
    return lookupRow;
  }

  protected JSONObject lookupRowToJson(LookupRow<?> lookupRow, boolean multipleColumns) {
    if (lookupRow == null) {
      return null;
    }

    JSONObject json = new JSONObject();
    json.put("key", getIdForLookupRowKey(lookupRow.getKey()));
    json.put("text", lookupRow.getText());
    if (StringUtility.hasText(lookupRow.getIconId())) {
      json.put("iconId", BinaryResourceUrlUtility.createIconUrl(lookupRow.getIconId()));
    }
    if (StringUtility.hasText(lookupRow.getTooltipText())) {
      json.put("tooltipText", lookupRow.getTooltipText());
    }
    if (StringUtility.hasText(lookupRow.getBackgroundColor())) {
      json.put("backgroundColor", lookupRow.getBackgroundColor());
    }
    if (StringUtility.hasText(lookupRow.getForegroundColor())) {
      json.put("foregroundColor", lookupRow.getForegroundColor());
    }
    if (lookupRow.getFont() != null) {
      json.put("font", lookupRow.getFont().toPattern());
    }
    if (!lookupRow.isEnabled()) {
      json.put("enabled", lookupRow.isEnabled());
    }
    if (lookupRow.getParentKey() != null) {
      json.put("parentKey", getIdForLookupRowKey(lookupRow.getParentKey()));
    }
    if (!lookupRow.isActive()) {
      json.put("active", lookupRow.isActive());
    }
    if (multipleColumns && lookupRow.getAdditionalTableRowData() != null) {
      json.put("additionalTableRowData", tableRowDataToJson(lookupRow.getAdditionalTableRowData()));
    }
    if (StringUtility.hasText(lookupRow.getCssClass())) {
      json.put("cssClass", lookupRow.getCssClass());
    }
    return json;
  }

  protected Object tableRowDataToJson(AbstractTableRowData tableRowData) {
    if (tableRowData == null) {
      return null;
    }
    return MainJsonObjectFactory.get().createJsonObject(tableRowData).toJson();
  }

  @SuppressWarnings("unchecked")
  protected VALUE getLookupRowKeyForId(String id) {
    if (StringUtility.isNullOrEmpty(id)) {
      return null;
    }
    else {
      return (VALUE) m_idToKeyMap.get(NumberUtility.parseInt(id));
    }
  }

  protected JSONArray columnDescriptorsToJson(Object value) {
    if (value == null) {
      return null;
    }
    ColumnDescriptor[] descs = (ColumnDescriptor[]) value;
    JSONArray array = new JSONArray();
    for (ColumnDescriptor desc : descs) {
      JSONObject json = new JSONObject();
      json.put("propertyName", desc.getPropertyName());
      json.put("width", desc.getWidth());
      json.put("text", desc.getText());
      array.put(json);
    }
    return array;
  }

  @Override
  public JSONObject toJson() {
    JSONObject json = super.toJson();
    json.put(ISmartField2.PROP_DISPLAY_STYLE, getModel().getDisplayStyle());
    json.put(ISmartField2.PROP_BROWSE_HIERARCHY, getModel().isBrowseHierarchy());
    return json;
  }
}
