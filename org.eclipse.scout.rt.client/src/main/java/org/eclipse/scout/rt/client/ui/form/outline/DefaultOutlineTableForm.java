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
package org.eclipse.scout.rt.client.ui.form.outline;

import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.status.IStatus;
import org.eclipse.scout.commons.status.Status;
import org.eclipse.scout.rt.client.session.ClientSessionProvider;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.tree.ITreeNode;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.desktop.outline.AbstractOutlineTableField;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutline;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutlineTableForm;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPage;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPageWithTable;
import org.eclipse.scout.rt.client.ui.form.AbstractForm;
import org.eclipse.scout.rt.client.ui.form.AbstractFormHandler;
import org.eclipse.scout.rt.client.ui.form.fields.groupbox.AbstractGroupBox;
import org.eclipse.scout.rt.client.ui.form.outline.DefaultOutlineTableForm.MainBox.OutlineTableField;

/**
 * Default form displaying the current page's table
 */
public class DefaultOutlineTableForm extends AbstractForm implements IOutlineTableForm {
  public DefaultOutlineTableForm() throws ProcessingException {
    super();
  }

  @Override
  protected boolean getConfiguredAskIfNeedSave() {
    return false;
  }

  @Override
  protected int getConfiguredDisplayHint() {
    return DISPLAY_HINT_VIEW;
  }

  @Override
  protected String getConfiguredDisplayViewId() {
    return VIEW_ID_PAGE_TABLE;
  }

  @Override
  public ITable getCurrentTable() {
    return getOutlineTableField().getTable();
  }

  @Override
  public void setCurrentTable(ITable table) {
    getOutlineTableField().installTable(table);
  }

  public MainBox getMainBox() {
    return (MainBox) getRootGroupBox();
  }

  public OutlineTableField getOutlineTableField() {
    return getFieldByClass(OutlineTableField.class);
  }

  public void startView() throws ProcessingException {
    setShowOnStart(false);
    startInternal(new ViewHandler());
    ClientSessionProvider.currentSession().getDesktop().setOutlineTableForm(this);
  }

  @Order(10.0f)
  public class MainBox extends AbstractGroupBox {

    @Override
    protected boolean getConfiguredBorderVisible() {
      return false;
    }

    @Override
    protected int getConfiguredGridColumnCount() {
      return 2;
    }

    @Order(10.0f)
    public class OutlineTableField extends AbstractOutlineTableField {

      @Override
      protected int getConfiguredGridW() {
        return 2;
      }

      @Override
      protected int getConfiguredGridH() {
        return 2;
      }

      @Override
      protected boolean getConfiguredTableStatusVisible() {
        return true;
      }

      @Override
      protected void execUpdateTableStatus() {
        if (!isTableStatusVisible()) {
          return;
        }
        IOutline outline = getDesktop().getOutline();
        // populate status
        IStatus populateStatus = null;
        if (outline != null && outline.getActivePage() != null) {
          IPage<?> activePage = outline.getActivePage();
          populateStatus = activePage.getPagePopulateStatus();
        }
        setTablePopulateStatus(populateStatus);

        // selection status for table pages only
        IStatus selectionStatus = null;
        if (outline != null && outline.getActivePage() instanceof IPageWithTable<?>) {
          IPageWithTable<?> tablePage = (IPageWithTable<?>) outline.getActivePage();
          //selection status
          if (tablePage.isSearchActive() && tablePage.getSearchFilter() != null && (!tablePage.getSearchFilter().isCompleted()) && tablePage.isSearchRequired()) {
            // clear status
          }
          else if (populateStatus != null && populateStatus.getSeverity() == IStatus.WARNING) {
            // clear status
          }
          else {
            selectionStatus = new Status(createDefaultTableStatus(), IStatus.INFO);
          }
        }
        setTableSelectionStatus(selectionStatus);
      }

      @Override
      protected void execTableTitleChanged() {
        IDesktop desktop = ClientSessionProvider.currentSession().getDesktop();
        ITreeNode node = null;
        if (getTable() != null) {
          if (desktop.getOutline() != null) {
            node = desktop.getOutline().getSelectedNode();
          }
        }
        // set form title and form icon
        if (node != null) {
          setTitle(desktop.getOutline().getPathText(node));
          setIconId(node.getCell().getIconId());
        }
        else {
          setTitle(null);
          setIconId(null);
        }
      }
    }
  }

  @Order(10.0f)
  public class ViewHandler extends AbstractFormHandler {
  }
}
