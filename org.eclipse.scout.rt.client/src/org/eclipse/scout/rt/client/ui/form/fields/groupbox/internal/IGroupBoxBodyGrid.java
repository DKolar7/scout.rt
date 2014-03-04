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
package org.eclipse.scout.rt.client.ui.form.fields.groupbox.internal;

import org.eclipse.scout.rt.client.ui.form.fields.groupbox.IGroupBox;

/**
 * @author Andreas Hoegger
 * @since 4.0.0 M6 25.02.2014
 */
public interface IGroupBoxBodyGrid {

  /**
   *
   */
  void validate(IGroupBox groupBox);

  /**
   * @return
   */
  int getGridColumnCount();

  /**
   * @return
   */
  int getGridRowCount();

}
