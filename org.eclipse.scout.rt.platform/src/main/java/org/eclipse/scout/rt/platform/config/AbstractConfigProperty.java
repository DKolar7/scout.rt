/*******************************************************************************
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.platform.config;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.platform.util.event.FastListenerList;
import org.eclipse.scout.rt.platform.util.event.IFastListenerList;

@SuppressWarnings("findbugs:UG_SYNC_SET_UNSYNC_GET")
public abstract class AbstractConfigProperty<DATA_TYPE, RAW_TYPE> implements IConfigProperty<DATA_TYPE> {

  private final Map<String /* namespace, may be null */, P_ParsedPropertyValueEntry<DATA_TYPE>> m_values = new HashMap<>();
  private final FastListenerList<IConfigChangedListener> m_listeners = new FastListenerList<>();

  @Override
  public DATA_TYPE getDefaultValue() {
    return null;
  }

  protected abstract DATA_TYPE parse(RAW_TYPE value);

  protected String createKey(String namespace) {
    StringBuilder b = new StringBuilder();
    if (StringUtility.hasText(namespace)) {
      b.append(namespace);
      b.append(PropertiesHelper.NAMESPACE_DELIMITER);
    }
    b.append(getKey());
    return b.toString();
  }

  @Override
  public synchronized DATA_TYPE getValue(String namespace) {
    String key = createKey(namespace);
    P_ParsedPropertyValueEntry<DATA_TYPE> entry = m_values.computeIfAbsent(key, k -> read(namespace));

    if (entry.m_exc != null) {
      throw entry.m_exc;
    }
    return entry.m_value;
  }

  @SuppressWarnings("unchecked")
  protected RAW_TYPE readFromSource(String namespace) {
    return (RAW_TYPE) ConfigUtility.getProperty(getKey(), null, namespace);
  }

  protected P_ParsedPropertyValueEntry<DATA_TYPE> read(String namespace) {
    DATA_TYPE parsedValue = null;
    PlatformException ex = null;
    try {
      RAW_TYPE value = readFromSource(namespace);
      if (value == null) {
        parsedValue = getDefaultValue();
      }
      else {
        parsedValue = parse(value);
      }
    }
    catch (PlatformException t) {
      ex = t;
    }
    catch (Exception e) {
      ex = new PlatformException(e.getMessage(), e);
    }
    fireConfigChangedEvent(new ConfigPropertyChangeEvent(this, null, parsedValue, namespace, ConfigPropertyChangeEvent.TYPE_VALUE_INITIALIZED));
    return new P_ParsedPropertyValueEntry<>(parsedValue, ex);
  }

  @Override
  public DATA_TYPE getValue() {
    return getValue(null);
  }

  @Override
  public synchronized void invalidate() {
    m_values.clear();
    fireConfigChangedEvent(new ConfigPropertyChangeEvent(this, null, null, null, ConfigPropertyChangeEvent.TYPE_INVALIDATE));
  }

  @Override
  public void setValue(DATA_TYPE newValue) {
    setValue(newValue, null);
  }

  @Override
  public synchronized void setValue(DATA_TYPE newValue, String namespace) {
    String key = createKey(namespace);
    P_ParsedPropertyValueEntry<DATA_TYPE> old = m_values.put(key, new P_ParsedPropertyValueEntry<>(newValue, null));
    Object oldValue = null;
    if (old != null) {
      oldValue = old.m_value;
    }
    fireConfigChangedEvent(new ConfigPropertyChangeEvent(this, oldValue, newValue, namespace, ConfigPropertyChangeEvent.TYPE_VALUE_CHANGED));
  }

  @Override
  public IFastListenerList<IConfigChangedListener> configChangedListeners() {
    return m_listeners;
  }

  protected void fireConfigChangedEvent(ConfigPropertyChangeEvent e) {
    configChangedListeners().list().forEach(listener -> listener.configPropertyChanged(e));
  }

  private static final class P_ParsedPropertyValueEntry<TYPE> {
    private final TYPE m_value;
    private final PlatformException m_exc;

    private P_ParsedPropertyValueEntry(TYPE value, PlatformException exc) {
      m_value = value;
      m_exc = exc;
    }
  }
}
