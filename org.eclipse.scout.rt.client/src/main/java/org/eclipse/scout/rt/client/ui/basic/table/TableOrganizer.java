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
package org.eclipse.scout.rt.client.ui.basic.table;

import java.util.List;

import org.eclipse.scout.rt.client.ui.basic.table.columns.IColumn;
import org.eclipse.scout.rt.client.ui.basic.table.customizer.ICustomColumn;
import org.eclipse.scout.rt.client.ui.basic.table.customizer.ITableCustomizer;
import org.eclipse.scout.rt.client.ui.basic.table.organizer.IShowInvisibleColumnsForm;
import org.eclipse.scout.rt.client.ui.basic.table.organizer.ITableOrganizer;
import org.eclipse.scout.rt.client.ui.basic.table.organizer.ShowInvisibleColumnsForm;
import org.eclipse.scout.rt.security.ACCESS;
import org.eclipse.scout.rt.shared.security.CreateCustomColumnPermission;
import org.eclipse.scout.rt.shared.security.DeleteCustomColumnPermission;
import org.eclipse.scout.rt.shared.security.UpdateCustomColumnPermission;

/**
 * @since 5.2
 */
public class TableOrganizer implements ITableOrganizer {

  private final ITable m_table;

  public TableOrganizer(ITable table) {
    m_table = table;
  }

  @Override
  public boolean isColumnAddable() {
    return isCustomizable() && hasCreatePermission() || hasInvisibleColumns();
  }

  protected boolean hasInvisibleColumns() {
    ColumnSet columnSet = m_table.getColumnSet();
    return columnSet.getVisibleColumnCount() < columnSet.getDisplayableColumnCount();
  }

  @Override
  @SuppressWarnings("squid:CommentedOutCodeLine")
  public boolean isColumnRemovable(IColumn column) {
    // We could write column.isVisible() || isCustomizable() && hasRemovePermission() && isCustom(column)
    // here but the outcome would be the same as 'true', because the given column is always visible here.
    return true;
  }

  @Override
  public boolean isColumnModifiable(IColumn column) {
    return isCustomizable() && hasModifyPermission() && isCustom(column);
  }

  @Override
  public void addColumn(IColumn insertAfterColumn) {
    if (isCustomizable() && hasCreatePermission()) {
      getCustomizer().addColumn(insertAfterColumn);
    }
    else if (hasInvisibleColumns()) {
      showInvisibleColumnsForm(insertAfterColumn);
    }
  }

  protected void showInvisibleColumnsForm(IColumn<?> insertAfterColumn) {
    IShowInvisibleColumnsForm form = new ShowInvisibleColumnsForm(m_table).withInsertAfterColumn(insertAfterColumn);
    form.startModify();
    form.waitFor();
  }

  @Override
  public void removeColumn(IColumn column) {
    if (isCustom(column)) {
      if (isCustomizable() && hasRemovePermission()) {
        getCustomizer().removeColumn((ICustomColumn) column);
      }
    }
    else {
      if (column.isVisible()) {
        hideColumn(column);
      }
    }
  }

  protected void hideColumn(IColumn column) {
    ColumnSet columnSet = m_table.getColumnSet();
    List<IColumn<?>> visibleColumns = columnSet.getVisibleColumns();
    visibleColumns.remove(column);
    columnSet.setVisibleColumns(visibleColumns);
  }

  @Override
  public void modifyColumn(IColumn column) {
    if (isCustomizable() && hasModifyPermission()) {
      getCustomizer().modifyColumn((ICustomColumn) column);
    }
  }

  protected boolean isCustom(IColumn column) {
    return column instanceof ICustomColumn;
  }

  protected boolean isCustomizable() {
    return m_table.isCustomizable();
  }

  protected ITableCustomizer getCustomizer() {
    return m_table.getTableCustomizer();
  }

  protected boolean hasCreatePermission() {
    return ACCESS.check(new CreateCustomColumnPermission());
  }

  protected boolean hasModifyPermission() {
    return ACCESS.check(new UpdateCustomColumnPermission());
  }

  protected boolean hasRemovePermission() {
    return ACCESS.check(new DeleteCustomColumnPermission());
  }

  protected ITable getTable() {
    return m_table;
  }

}
