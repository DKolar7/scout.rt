/*******************************************************************************
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.desktop.notification;

import org.eclipse.scout.rt.client.ModelContextProxy;
import org.eclipse.scout.rt.client.ModelContextProxy.ModelContext;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.notification.Notification;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.status.IStatus;
import org.eclipse.scout.rt.platform.status.Status;

public class DesktopNotification extends Notification implements IDesktopNotification {

  private final long m_duration;
  private final boolean m_closable;
  private final IDesktopNotificationUIFacade m_uiFacade = BEANS.get(ModelContextProxy.class).newProxy(new P_UIFacade(), ModelContext.copyCurrent());

  /**
   * Creates a closable, simple info notification with a text and the default duration.
   */
  public DesktopNotification(String text) {
    this(new Status(text, IStatus.INFO));
  }

  /**
   * Creates a closable notification with a status and the default duration.
   */
  public DesktopNotification(IStatus status) {
    super(status);
    m_duration = DEFAULT_DURATION;
    m_closable = true;
  }

  /**
   * Creates a notification.
   *
   * @param status
   * @param duration
   *          in milliseconds
   * @param closable
   */
  public DesktopNotification(IStatus status, long duration, boolean closable) {
    super(status);
    m_duration = duration;
    m_closable = closable;
  }

  @Override
  public long getDuration() {
    return m_duration;
  }

  @Override
  public boolean isClosable() {
    return m_closable;
  }

  @Override
  public IDesktopNotificationUIFacade getUIFacade() {
    return m_uiFacade;
  }

  protected class P_UIFacade implements IDesktopNotificationUIFacade {

    @Override
    public void fireClosedFromUI() {
      IDesktop.CURRENT.get().getUIFacade().removedNotificationFromUI(DesktopNotification.this);
    }
  }
}
