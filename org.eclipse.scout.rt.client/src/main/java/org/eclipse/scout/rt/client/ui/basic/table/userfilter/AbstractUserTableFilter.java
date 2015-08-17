/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.basic.table.userfilter;

/**
 * @since 5.1
 */
public class AbstractUserTableFilter implements IUserTableFilter {
  private static final long serialVersionUID = 1L;
  private String m_type;

  @Override
  public String getType() {
    return m_type;
  }

  @Override
  public void setType(String type) {
    m_type = type;
  }

  @Override
  public Object createKey() {
    return m_type;
  }

}
