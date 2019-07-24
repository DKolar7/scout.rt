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
package org.eclipse.scout.rt.ui.html.json.form.fields.browserfield;

import org.eclipse.scout.rt.client.job.ModelJobs;
import org.eclipse.scout.rt.client.ui.form.fields.browserfield.BrowserFieldEvent;
import org.eclipse.scout.rt.client.ui.form.fields.browserfield.BrowserFieldListener;
import org.eclipse.scout.rt.client.ui.form.fields.browserfield.IBrowserField;
import org.eclipse.scout.rt.client.ui.form.fields.browserfield.IBrowserField.SandboxPermission;
import org.eclipse.scout.rt.platform.resource.BinaryResource;
import org.eclipse.scout.rt.ui.html.IUiSession;
import org.eclipse.scout.rt.ui.html.json.IJsonAdapter;
import org.eclipse.scout.rt.ui.html.json.JsonEvent;
import org.eclipse.scout.rt.ui.html.json.JsonProperty;
import org.eclipse.scout.rt.ui.html.json.form.fields.JsonFormField;
import org.eclipse.scout.rt.ui.html.res.BinaryResourceHolder;
import org.eclipse.scout.rt.ui.html.res.BinaryResourceUrlUtility;
import org.eclipse.scout.rt.ui.html.res.IBinaryResourceProvider;
import org.json.JSONObject;

import java.util.Set;

public class JsonBrowserField<BROWSER_FIELD extends IBrowserField> extends JsonFormField<BROWSER_FIELD> implements IBinaryResourceProvider {

  private BrowserFieldListener m_browserFieldListener;

  public static final String EVENT_POST_MESSAGE = "postMessage";
  public static final String EVENT_EXTERNAL_WINDOW_STATE_CHANGE = "externalWindowStateChange";

  public JsonBrowserField(BROWSER_FIELD model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "BrowserField";
  }

  @Override
  protected void initJsonProperties(BROWSER_FIELD model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_SCROLL_BAR_ENABLED, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isScrollBarEnabled();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_SANDBOX_ENABLED, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isSandboxEnabled();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_SANDBOX_PERMISSIONS, model) {
      @Override
      protected Set<SandboxPermission> modelValue() {
        return getModel().getSandboxPermissions();
      }

      @Override
      @SuppressWarnings("unchecked")
      public Object prepareValueForToJson(Object value) {
        Set<SandboxPermission> sandbox = (Set<SandboxPermission>) value;
        if (sandbox == null || sandbox.isEmpty()) {
          return "";
        }
        // Build string for HTML "sandbox" attribute
        StringBuilder sb = new StringBuilder();
        for (SandboxPermission sandboxValue : sandbox) {
          sb.append(sandboxValue.getAttribute()).append(" ");
        }
        sb.deleteCharAt(sb.length() - 1); // delete last space
        return sb.toString();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_SHOW_IN_EXTERNAL_WINDOW, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isShowInExternalWindow();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_EXTERNAL_WINDOW_BUTTON_TEXT, model) {
      @Override
      protected String modelValue() {
        return getModel().getExternalWindowButtonText();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_EXTERNAL_WINDOW_FIELD_TEXT, model) {
      @Override
      protected String modelValue() {
        return getModel().getExternalWindowFieldText();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_AUTO_CLOSE_EXTERNAL_WINDOW, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isAutoCloseExternalWindow();
      }
    });
    putJsonProperty(new JsonProperty<IBrowserField>(IBrowserField.PROP_TRACK_LOCATION, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isTrackLocationChange();
      }
    });
  }

  @Override
  protected void attachModel() {
    super.attachModel();
    if (m_browserFieldListener != null) {
      throw new IllegalStateException();
    }
    m_browserFieldListener = new P_BrowserFieldListener();
    getModel().addBrowserFieldListener(m_browserFieldListener);
  }

  @Override
  protected void detachModel() {
    super.detachModel();
    if (m_browserFieldListener == null) {
      throw new IllegalStateException();
    }
    getModel().removeBrowserFieldListener(m_browserFieldListener);
    m_browserFieldListener = null;
  }

  @Override
  public JSONObject toJson() {
    JSONObject json = super.toJson();
    putProperty(json, IBrowserField.PROP_LOCATION, getLocation());
    return json;
  }

  @Override
  public BinaryResourceHolder provideBinaryResource(String filenameWithFingerprint) {
    BinaryResourceHolder holder = BinaryResourceUrlUtility.provideBinaryResource(filenameWithFingerprint, getModel().getUIFacade()::requestBinaryResourceFromUI);
    holder.addHttpResponseInterceptor(new BrowserFieldContentHttpResponseInterceptor(getUiSession()));
    return holder;
  }

  protected void handleModelContentChanged() {
    addPropertyChangeEvent(IBrowserField.PROP_LOCATION, getLocation());
  }

  protected void handleModelBrowserFieldEvent(BrowserFieldEvent event) {
    if (BrowserFieldEvent.TYPE_CONTENT_CHANGED == event.getType()) {
      handleModelContentChanged();
    }
  }

  @Override
  public void handleUiEvent(JsonEvent event) {
    if (EVENT_POST_MESSAGE.equals(event.getType())) {
      handleUiPostMessage(event);
    }
    else if (EVENT_EXTERNAL_WINDOW_STATE_CHANGE.equals(event.getType())) {
      handleUiExternalWindowStateChange(event);
    }
    else {
      super.handleUiEvent(event);
    }
  }

  @Override
  protected void handleUiPropertyChange(String propertyName, JSONObject data) {
    if (IBrowserField.PROP_LOCATION.equals(propertyName)) {
      handleUiLocationChange(data);
    }
    else {
      super.handleUiPropertyChange(propertyName, data);
    }
  }

  protected void handleUiLocationChange(JSONObject data) {
    String location = data.getString(IBrowserField.PROP_LOCATION);
    addPropertyEventFilterCondition(IBrowserField.PROP_LOCATION, location);
    getModel().getUIFacade().setLocationFromUi(location);
  }

  protected void handleUiPostMessage(JsonEvent event) {
    String data = event.getData().optString("data", null);
    String origin = event.getData().optString("origin", null);
    getModel().getUIFacade().firePostMessageFromUI(data, origin);
  }

  protected void handleUiExternalWindowStateChange(JsonEvent event) {
    getModel().getUIFacade().firePostExternalWindowStateFromUI(event.getData().optBoolean("windowState"));
  }

  protected String getLocation() {
    String location = getModel().getLocation();
    BinaryResource binaryResource = getModel().getBinaryResource();
    if (location == null && binaryResource != null) {
      location = BinaryResourceUrlUtility.createDynamicAdapterResourceUrl(this, binaryResource);
    }
    return location;
  }

  protected class P_BrowserFieldListener implements BrowserFieldListener {
    @Override
    public void browserFieldChanged(BrowserFieldEvent e) {
      ModelJobs.assertModelThread();
      handleModelBrowserFieldEvent(e);
    }
  }
}
