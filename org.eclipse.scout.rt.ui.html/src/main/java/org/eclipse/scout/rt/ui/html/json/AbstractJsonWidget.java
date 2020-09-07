/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.ui.html.json;

import org.eclipse.scout.rt.client.job.ModelJobs;
import org.eclipse.scout.rt.client.ui.IWidget;
import org.eclipse.scout.rt.client.ui.WidgetEvent;
import org.eclipse.scout.rt.client.ui.WidgetListener;
import org.eclipse.scout.rt.ui.html.IUiSession;

/**
 * @since 8.0
 */
public abstract class AbstractJsonWidget<T extends IWidget> extends AbstractJsonPropertyObserver<T> {

  protected static final String EVENT_SCROLL_TO_TOP = "scrollToTop";

  private WidgetListener m_listener;

  public AbstractJsonWidget(T model, IUiSession uiSession, String id, IJsonAdapter<?> parent) {
    super(model, uiSession, id, parent);
  }

  @Override
  public String getObjectType() {
    return "Widget";
  }

  @Override
  protected void initJsonProperties(T model) {
    super.initJsonProperties(model);
    putJsonProperty(new JsonProperty<T>(IWidget.PROP_CSS_CLASS, model) {
      @Override
      protected String modelValue() {
        return getModel().getCssClass();
      }
    });
    putJsonProperty(new JsonProperty<T>(IWidget.PROP_ENABLED, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isEnabled();
      }
    });
    putJsonProperty(new JsonProperty<T>(IWidget.PROP_INHERIT_ACCESSIBILITY, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isInheritAccessibility();
      }
    });
    putJsonProperty(new JsonProperty<T>(IWidget.PROP_LOADING, model) {
      @Override
      protected Boolean modelValue() {
        return getModel().isLoading();
      }
    });
  }

  @Override
  protected void attachModel() {
    super.attachModel();
    if (m_listener != null) {
      throw new IllegalStateException();
    }
    m_listener = new P_WidgetListener();
    getModel().addWidgetListener(m_listener);
  }

  @Override
  protected void detachModel() {
    super.detachModel();
    if (m_listener == null) {
      throw new IllegalStateException();
    }
    getModel().removeWidgetListener(m_listener);
    m_listener = null;
  }

  protected void handleModelWidgetEvent(WidgetEvent event) {
    if (event.getType() == WidgetEvent.TYPE_SCROLL_TO_TOP) {
      handleModelScrollTopTop();
    }
  }

  protected void handleModelScrollTopTop() {
    addActionEvent(EVENT_SCROLL_TO_TOP);
  }

  protected class P_WidgetListener implements WidgetListener {

    @Override
    public void widgetChanged(WidgetEvent e) {
      ModelJobs.assertModelThread();
      handleModelWidgetEvent(e);
    }
  }
}
