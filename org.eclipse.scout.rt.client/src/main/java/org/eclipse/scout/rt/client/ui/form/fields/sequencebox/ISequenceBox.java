/*
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.client.ui.form.fields.sequencebox;

import org.eclipse.scout.rt.client.ui.action.menu.root.IContextMenuOwner;
import org.eclipse.scout.rt.client.ui.form.fields.ICompositeField;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.client.ui.form.fields.LogicalGridLayoutConfig;

/**
 * A {@link IFormField} that contains an ordered sequence of {@link IFormField}s.<br>
 * E.g. a range with start and end date.
 */
public interface ISequenceBox extends ICompositeField, IContextMenuOwner {

  String PROP_LAYOUT_CONFIG = "layoutConfig";

  /**
   * @return true, if the sequence is validated automatically, whenever a value of the contained fields changes.
   *         <code>false</code> otherwise.
   */
  boolean isAutoCheckFromTo();

  /**
   * <code>true</code>: The sequence of contained fields is validated automatically, whenever a value of the contained
   * fields changes.<br>
   * <code>false</code>: The sequence of contained fields is not validated automatically.
   */
  void setAutoCheckFromTo(boolean autoCheckFromTo);

  void setLayoutConfig(LogicalGridLayoutConfig config);

  LogicalGridLayoutConfig getLayoutConfig();
}
