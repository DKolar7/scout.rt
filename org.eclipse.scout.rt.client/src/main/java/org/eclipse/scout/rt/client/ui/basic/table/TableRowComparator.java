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
package org.eclipse.scout.rt.client.ui.basic.table;

import java.util.Collection;
import java.util.Comparator;

import org.eclipse.scout.rt.client.ui.basic.table.columns.IColumn;

/**
 * compares two TableRow objects based on 1 ore more columns
 */
@SuppressWarnings("squid:S2063")
public class TableRowComparator implements Comparator<ITableRow> {
  private final Collection<IColumn<?>> m_columns;

  public TableRowComparator(Collection<IColumn<?>> columns) {
    m_columns = columns;
  }

  @Override
  public int compare(ITableRow row1, ITableRow row2) {
    for (IColumn col : m_columns) {
      int c = col.compareTableRows(row1, row2);
      if (col.isSortActive() && !col.getHeaderCell().isSortAscending()) {
        // only consider sortAscending flag when sort is active
        // columns with !sortActive are always sorted ascending (sortAscending represents last state for those, thus not considered)
        c = -c;
      }

      if (c != 0) {
        return c;
      }
    }
    return 0;
  }

  @Override
  public boolean equals(Object obj) {
    return obj != null && obj.getClass() == this.getClass() && ((TableRowComparator) obj).m_columns == this.m_columns;
  }

  @Override
  public int hashCode() {
    return 0;
  }
}
