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
package org.eclipse.scout.rt.client.ui.desktop.outline.pages;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.IMenuType;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.table.internal.TablePageTreeMenuWrapper;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutline5;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineEvent;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineMenuType;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineNavigation;
import org.eclipse.scout.rt.client.ui.form.FormMenuType;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.eclipse.scout.rt.client.ui.form.IForm5;
import org.eclipse.scout.rt.extension.client.ui.desktop.outline.pages.AbstractExtensiblePageWithNodes;
import org.eclipse.scout.rt.shared.services.common.exceptionhandler.IExceptionHandlerService;
import org.eclipse.scout.rt.shared.ui.menu.IMenu5;
import org.eclipse.scout.rt.shared.ui.menu.MenuWrapper;
import org.eclipse.scout.service.SERVICES;

public abstract class AbstractPageWithNodes5 extends AbstractExtensiblePageWithNodes implements IPage5 {

  private boolean m_detailFormVisible = true;

  private boolean m_navigateUp;

  public AbstractPageWithNodes5() {
    super();
  }

  public AbstractPageWithNodes5(boolean callInitializer) {
    super(callInitializer);
  }

  @Override
  protected void execInitPage() throws ProcessingException {
    ITable table = getInternalTable();
    table.addMenu(OutlineNavigation.createUp(getOutline()));
    table.addMenu(OutlineNavigation.createDown(getOutline()));
  }

  /**
   * @deprecated Will be removed in the 6.0 Release.
   *             Use {@link #AbstractExtensiblePageWithNodes()} in combination with getter and setter (page variable)
   *             instead.
   */
  @Deprecated
  @SuppressWarnings("deprecation")
  public AbstractPageWithNodes5(org.eclipse.scout.rt.shared.ContextMap contextMap) {
    super(contextMap);
  }

  public AbstractPageWithNodes5(String userPreferenceContext) {
    super(userPreferenceContext);
  }

  public AbstractPageWithNodes5(boolean callInitializer, String userPreferenceContext) {
    super(callInitializer, userPreferenceContext);
  }

  @Override
  public void pageActivatedNotify() {
    super.pageActivatedNotify();
    handleNavigateUp();
    try {
      ensureDetailFormCreated();
      ensureDetailFormStarted();
    }
    catch (ProcessingException e) {
      SERVICES.getService(IExceptionHandlerService.class).handleException(e);
    }
  }

  private void handleNavigateUp() {
    if (m_navigateUp) {
      m_navigateUp = false;
    }
    else {
      setDetailFormVisible(true);
    }
  }

  @Override
  public void setNavigateUp() {
    m_navigateUp = true;
  }

  @Override
  protected void execDisposePage() throws ProcessingException {
    if (getDetailForm() != null) {
      getDetailForm().doClose();
      setDetailForm(null);
    }
  }

  protected IForm execCreateDetailForm() throws ProcessingException {
    return null;
  }

  protected void execStartDetailForm(IForm form) throws ProcessingException {
  }

  protected void ensureDetailFormCreated() throws ProcessingException {
    if (getDetailForm() != null) {
      return;
    }
    IForm form = execCreateDetailForm();
    if (form != null) {
      if (form instanceof IForm5) {
        IForm5 form5 = (IForm5) form;
        List<IMenu> menus = form5.getContextMenu().getChildActions();
        adaptDetailFormMenus(menus);
        if (!CollectionUtility.equalsCollection(menus, ((IForm5) form).getContextMenu().getChildActions())) {
          form5.getContextMenu().setChildActions(menus);
        }
      }
    }
    setDetailForm(form);
  }

  @Override
  public void setDetailForm(IForm form) {
    IForm oldDetailForm = getDetailForm();
    if (oldDetailForm != form) {
      super.setDetailForm(form);
      ((IOutline5) getOutline()).fireOutlineEvent(new OutlineEvent(getTree(), OutlineEvent.TYPE_PAGE_CHANGED, this));
    }
  }

  protected void ensureDetailFormStarted() throws ProcessingException {
    if (getDetailForm() == null || getDetailForm().isFormOpen()) {
      return;
    }
    execStartDetailForm(getDetailForm());
  }

  protected void adaptDetailFormMenus(List<IMenu> menus) throws ProcessingException {
    List<IMenu> copy = new LinkedList<IMenu>(menus);
    // Remove system menus (ok cancel)
    for (IMenu menu : copy) {
      if (menu instanceof IMenu5 && ((IMenu5) menu).getSystemType() != IMenu5.SYSTEM_TYPE_NONE) {
        menus.remove(menu);
      }
    }

    menus.add(OutlineNavigation.createUp(getOutline()));
    menus.add(OutlineNavigation.createDown(getOutline()));

    // Add page menus to the form
    for (IMenu menu : getOutline().getContextMenu().getChildActions()) {
      // FIXME CGU improve this
      if (menu instanceof TablePageTreeMenuWrapper && ((TablePageTreeMenuWrapper) menu).getWrappedMenu().getClass().getSimpleName().contains("OutlineNavigateDownMenu")) {
        continue;
      }
      Set<IMenuType> types = new HashSet<IMenuType>();
      for (IMenuType type : menu.getMenuTypes()) {
        if (type instanceof OutlineMenuType || type instanceof FormMenuType) {
          types.add(type);
        }
      }
      if (types.isEmpty()) {
        types.add(FormMenuType.Regular);
      }
      menus.add(new MenuWrapper(menu, types));
    }
  }

  @Override
  public boolean isDetailFormVisible() {
    return m_detailFormVisible;
  }

  @Override
  public void setDetailFormVisible(boolean visible) {
    boolean oldVisible = m_detailFormVisible;
    if (oldVisible != visible) {
      m_detailFormVisible = visible;
      fireOutlineEvent(OutlineEvent.TYPE_PAGE_CHANGED);
    }
  }

  @Override
  public void setTableVisible(boolean visible) {
    boolean oldVisible = isTableVisible();
    if (oldVisible != visible) {
      super.setTableVisible(visible);
      fireOutlineEvent(OutlineEvent.TYPE_PAGE_CHANGED);
    }
  }

  /**
   * Note: set*Visible methods are called by initConfig(), at this point getTree() is still null.
   */
  private void fireOutlineEvent(int eventType) {
    if (getTree() != null) {
      ((IOutline5) getOutline()).fireOutlineEvent(new OutlineEvent(getTree(), eventType, this));
    }
  }

}
