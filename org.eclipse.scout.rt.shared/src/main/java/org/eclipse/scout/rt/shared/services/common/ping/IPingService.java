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
package org.eclipse.scout.rt.shared.services.common.ping;

import org.eclipse.scout.commons.annotations.Priority;
import org.eclipse.scout.rt.platform.service.IService;
import org.eclipse.scout.rt.shared.TunnelToServer;
import org.eclipse.scout.rt.shared.validate.IValidationStrategy;
import org.eclipse.scout.rt.shared.validate.InputValidation;

@Priority(-3)
@InputValidation(IValidationStrategy.PROCESS.class)
@TunnelToServer
public interface IPingService extends IService {

  /**
   * Simple ping request (echo).
   *
   * @param s
   *          Text to transmit
   * @return Return value, as provided in argument
   */
  String ping(String s);

}
