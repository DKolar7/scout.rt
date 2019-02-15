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
package org.eclipse.scout.rt.client.testenvironment.ui.desktop;

import org.eclipse.scout.rt.client.ui.desktop.AbstractDesktop;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;

/**
 * {@link IDesktop} for Client Test Environment
 *
 * @author jbr
 */
public class TestEnvironmentDesktop extends AbstractDesktop {

  private Boolean m_overrideDefereDataChangeEvents; // TODO [9.x] abr: remove this flag

  @Override
  protected String getConfiguredTitle() {
    return "Test Environment Application";
  }

  @Override
  @SuppressWarnings("deprecation")
  protected boolean isDefereDataChangedEventsIfDesktopInBackground() {
    if (m_overrideDefereDataChangeEvents != null) {
      return m_overrideDefereDataChangeEvents.booleanValue();
    }
    return super.isDefereDataChangedEventsIfDesktopInBackground();
  }

  public void overrideDefereDataChangedEventsIfDesktopInBackground(Boolean b) {
    m_overrideDefereDataChangeEvents = b;
  }
}
