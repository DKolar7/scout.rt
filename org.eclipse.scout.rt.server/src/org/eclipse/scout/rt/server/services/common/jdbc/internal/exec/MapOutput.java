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
package org.eclipse.scout.rt.server.services.common.jdbc.internal.exec;

import java.util.Map;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.server.services.common.jdbc.parsers.token.IToken;
import org.eclipse.scout.rt.server.services.common.jdbc.parsers.token.ValueOutputToken;
import org.eclipse.scout.rt.server.services.common.jdbc.style.ISqlStyle;

class MapOutput implements IBindOutput {
  private Map<Object, Object> m_map;
  private Object m_mapKey;
  private ValueOutputToken m_source;
  private int m_batchIndex = -1;
  private int m_jdbcBindIndex = -1;
  private Object m_accumulator;

  public MapOutput(Map<Object, Object> map, Object mapKey, ValueOutputToken source) {
    m_map = map;
    m_mapKey = mapKey;
    m_source = source;
  }

  public IToken getToken() {
    return m_source;
  }

  public boolean isJdbcBind() {
    return !m_source.isSelectInto();
  }

  public int getJdbcBindIndex() {
    return m_jdbcBindIndex;
  }

  public void setJdbcBindIndex(int index) {
    m_jdbcBindIndex = index;
  }

  public boolean isBatch() {
    return m_source.isBatch();
  }

  public boolean isSelectInto() {
    return m_source.isSelectInto();
  }

  public void setNextBatchIndex(int i) {
    m_batchIndex = i;
  }

  public Class getBindType() {
    Object o = m_map.get(m_mapKey);
    return o != null ? o.getClass() : Object.class;
  }

  public void finishBatch() {
    m_map.put(m_mapKey, m_accumulator);
  }

  public void setReplaceToken(ISqlStyle style) {
    m_source.setReplaceToken("?");
  }

  public void consumeValue(Object value) throws ProcessingException {
    if (m_batchIndex == 0) {
      m_accumulator = value;
    }
    else {
      // ticket 83809
      throw new ProcessingException("expected a single value for map key \"" + m_source.getParsedToken() + "\" but got multiple values");
    }
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + "[bindType=" + getBindType() + ", key=" + m_mapKey + ", token=" + m_source + "]";
  }

}
