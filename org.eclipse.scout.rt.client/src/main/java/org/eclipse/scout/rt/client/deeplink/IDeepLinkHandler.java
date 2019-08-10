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
package org.eclipse.scout.rt.client.deeplink;

import java.util.regex.Matcher;

import org.eclipse.scout.rt.client.IClientSession;
import org.eclipse.scout.rt.platform.ApplicationScoped;

/**
 * Interface for all classes that provide deep-link logic.
 */
@ApplicationScoped
public interface IDeepLinkHandler {

  String NUMERIC_REGEX = "\\d+";

  /**
   * @return True if this handler can handle the given path, false otherwise
   */
  boolean matches(String path);

  /**
   * Executes the deep-link action on the model.
   *
   * @throws DeepLinkException
   *           when something went wrong while executing the {@link #handleImpl(Matcher, IClientSession)} method. For
   *           instance the user has no permissions to view the requested resource or the resource is not available
   * @return True if this handler has handled the given path, false otherwise
   */
  boolean handle(String path) throws DeepLinkException;

  /**
   * @return the name of this handler as used in the deep-link URL.
   */
  String getName();

}
