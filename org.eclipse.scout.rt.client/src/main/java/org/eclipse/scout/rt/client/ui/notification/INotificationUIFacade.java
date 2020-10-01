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
package org.eclipse.scout.rt.client.ui.notification;

public interface INotificationUIFacade {

  /**
   * Notification that the Notification was closed in the UI
   */
  void fireClosedFromUI();

  /**
   * Notification that the AppLink of the Notification was clicked
   */
  void fireAppLinkActionFromUI(String ref);
}
