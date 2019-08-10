/*
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.client.ui.basic.table.columns;

public interface IProposalColumn<LOOKUP_TYPE> extends ISmartColumn<LOOKUP_TYPE> {
  /**
   * {@link Integer}
   *
   * @since 6.1
   */
  String PROP_MAX_LENGTH = "maxLength";

  /**
   * {@link Boolean}
   *
   * @since 6.1
   */
  String PROP_TRIM_TEXT_ON_VALIDATE = "trimText";

  /**
   * @param maxLength
   *          of the text in this field. Negative values are automatically converted to 0.
   * @since 6.1
   */
  void setMaxLength(int maxLength);

  /**
   * @return the maximum length of text, default is 4000
   * @since 6.1
   */
  int getMaxLength();

  /**
   * @param b
   *          true if the entered text should pass through {@link String#trim()}
   * @since 6.1
   */
  void setTrimText(boolean b);

  /**
   * @return true if {@link String#trim()} is applied to the text entered, default true
   * @since 6.1
   */
  boolean isTrimText();
}
