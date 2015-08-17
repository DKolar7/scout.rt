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
public class TextUserTableFilter extends AbstractUserTableFilter implements IUserTableFilter {
  private static final long serialVersionUID = 1L;
  public static final String TYPE = "text";
  private String m_text;

  public TextUserTableFilter() {
    setType(TYPE);
  }

  public String getText() {
    return m_text;
  }

  public void setText(String text) {
    m_text = text;
  }

}
