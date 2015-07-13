/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.server.jaxws;

import java.security.AccessController;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.RunContext;
import org.eclipse.scout.rt.server.context.ServerRunContext;
import org.eclipse.scout.rt.server.context.ServerRunContexts;
import org.eclipse.scout.rt.server.session.ServerSessionProviderWithCache;
import org.eclipse.scout.rt.server.transaction.TransactionScope;

/**
 * Factory for {@link ServerRunContext} objects.
 * <p>
 * The default implementation creates a copy of the current calling {@link ServerRunContext} with transaction scope
 * {@link TransactionScope#REQUIRES_NEW}.
 *
 * @since 5.1
 */
@ApplicationScoped
public class ServerRunContextProvider {

  /**
   * Provides a {@link RunContext} for the given {@link Subject}.
   */
  public ServerRunContext provide(final Subject subject) throws ProcessingException {
    final ServerRunContext runContext = ServerRunContexts.copyCurrent().withSubject(subject);

    if (runContext.getSession() == null || !subject.equals(Subject.getSubject(AccessController.getContext()))) {
      runContext.withSession(BEANS.get(ServerSessionProviderWithCache.class).provide(runContext.copy()), true);
    }
    return runContext;
  }
}
