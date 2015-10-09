/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package com.bsiag.scout.rt.ui.html.json.form.fields.chartfield;

import java.math.BigDecimal;
import java.util.List;

import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.AbstractJsonPropertyObserver;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.MainJsonObjectFactory;
import org.json.JSONArray;
import org.json.JSONObject;

import com.bsiag.scout.rt.client.ui.form.fields.chartfield.IChart;
import com.bsiag.scout.rt.shared.chart.IChartBean;
import com.bsiag.scout.rt.shared.chart.IChartValueGroupBean;

/**
 *
 */
public class JsonChart<CHART extends IChart> extends AbstractJsonPropertyObserver<CHART> {
  public static final String EVENT_VALUE_CLICKED = "valueClicked";

  /**
   * @param model
   * @param uiSession
   * @param id
   * @param parent
   */
  public JsonChart(CHART model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  protected void initJsonProperties(CHART model) {
    super.initJsonProperties(model);

    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_CHART_DATA, model) {
      @Override
      protected IChartBean modelValue() {
        return getModel().getChartData();
      }

      @Override
      public Object prepareValueForToJson(Object value) {
        return MainJsonObjectFactory.get().createJsonObject(value).toJson();
      }

//      @Override
//      public Object prepareValueForToJson(Object value) {
//        JSONObject jsonChartBean = new JSONObject();
//        JSONArray jsonChartAxes = new JSONArray();
//        JSONArray jsonChartValueGroups = new JSONArray();
//        if (getModel().getChartData() != null) {
//          if (getModel().getChartData().getAxes() != null) {
//            for (List<String> axis : getModel().getChartData().getAxes()) {
//              jsonChartAxes.put(axisToJson(axis));
//            }
//          }
//          for (IChartValueGroupBean chartValueGroupBean : getModel().getChartData().getChartValueGroups()) {
//            jsonChartValueGroups.put(chartValueGroupBeanToJson(chartValueGroupBean));
//          }
//
//          jsonChartBean.put("customProperties", getModel().getChartData().getCustomProperties());
//        }
//        jsonChartBean.put("axes", jsonChartAxes);
//        jsonChartBean.put("chartValueGroups", jsonChartValueGroups);
//
//        return jsonChartBean;
//      }
    });

    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_AUTO_COLOR, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isAutoColor();
      }
    });

    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_AUTO_COLOR, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isAutoColor();
      }
    });
    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_CHART_TYPE, model) {
      @Override
      protected Integer modelValue() {
        return getModel().getChartType();
      }
    });
    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_ENABLED, model) {
      @Override
      protected Object modelValue() {
        return getModel().isEnabled();
      }
    });
    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_VISIBLE, model) {
      @Override
      protected Object modelValue() {
        return getModel().isVisible();
      }
    });
    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_MAX_SEGMENTS, model) {
      @Override
      protected Object modelValue() {
        return getModel().getMaxSegments();
      }
    });
    putJsonProperty(new JsonProperty<IChart>(IChart.PROP_MODEL_HANDELS_CLICK, model) {
      @Override
      protected Object modelValue() {
        return getModel().isModelHandelsClick();
      }
    });
  }

  @Override
  public String getObjectType() {
    return "Chart";
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    if (EVENT_VALUE_CLICKED.equals(event.getType())) {
      handleUiValueClicked(event);
    }
    else {
      super.handleUiEvent(event);
    }
  }

  protected void handleUiValueClicked(JsonEvent event) {
    // TODO nbu
    getModel().getUIFacade().fireUIValueClicked(new int[0], null);
  }

  protected JSONObject chartValueGroupBeanToJson(IChartValueGroupBean chartValueGroupBean) {
    JSONObject jsonChartValueGroupBean = new JSONObject();
    putProperty(jsonChartValueGroupBean, "groupName", chartValueGroupBean.getGroupName());
    putProperty(jsonChartValueGroupBean, "color", chartValueGroupBean.getColorHexValue());
    JSONArray jsonValues = new JSONArray();
    for (BigDecimal value : chartValueGroupBean.getValues()) {
      jsonValues.put(value);
    }
    putProperty(jsonChartValueGroupBean, "values", jsonValues);

    return jsonChartValueGroupBean;
  }

  protected JSONArray axisToJson(List<String> axis) {
    JSONArray jsonAxisValues = new JSONArray();
    for (String axisValue : axis) {
      jsonAxisValues.put(axisValue);
    }
    return jsonAxisValues;
  }

}
