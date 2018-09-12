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
package org.eclipse.scout.rt.shared.session;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.logger.DiagnosticContextValueProcessor;
import org.eclipse.scout.rt.platform.logger.DiagnosticContextValueProcessor.IDiagnosticContextValueProvider;
import org.eclipse.scout.rt.shared.ISession;
import org.slf4j.MDC;

/**
 * This class provides the {@link ISession#getId()} to be set into the <code>diagnostic context map</code> for logging
 * purpose.
 *
 * @see #KEY
 * @see DiagnosticContextValueProcessor
 * @see MDC
 */
@ApplicationScoped
public class ScoutSessionIdContextValueProvider implements IDiagnosticContextValueProvider {

  public static final String KEY = "scout.session.id";

  @Override
  public String key() {
    return KEY;
  }

  @Override
  public String value() {
    final ISession session = ISession.CURRENT.get();
    return session != null ? session.getId() : null;
  }
}
