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
package org.eclipse.scout.rt.client.deeplink;

import org.eclipse.scout.rt.platform.exception.VetoException;

/**
 * A checked exception which indicates that a deep-link URL could not be processed for some (business logic) reason.
 * There are two cases:
 * <ol>
 * <li>The regex pattern is valid and matches, but no data has been found for the requested deep-link path</li>
 * <li>A resource has been found but the current user has no permissions to read the resource. In that case this
 * exception contains the original VetoException as cause</li>
 * </ol>
 */
public class DeepLinkException extends Exception {

  private static final long serialVersionUID = 1L;

  public DeepLinkException() {
    super();
  }

  /**
   * Use this constructor if resource requested by deep-link was not found.
   *
   * @param message
   */
  public DeepLinkException(String message) {
    super(message);
  }

  /**
   * Use this constructor if user has insufficient permissions to display the requested deep-link.
   *
   * @param cause
   *          the original VetoException thrown when permission is denied
   */
  public DeepLinkException(VetoException cause) {
    super(cause);
  }

}
