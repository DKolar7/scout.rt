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
package org.eclipse.scout.rt.client.job;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.rt.client.context.ClientRunContext;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.job.JobInput;

/**
 * Validator for {@link JobInput} used for model jobs.
 *
 * @since 5.1
 */
@ApplicationScoped
public class ModelJobInputValidator {

  /**
   * Validates the given {@link JobInput} and {@link ClientRunContext}.
   */
  public void validate(final JobInput input) {
    Assertions.assertNotNull(input, "ModelJob requires a 'JobInput'");
    Assertions.assertTrue(input.getRunContext() instanceof ClientRunContext, "ModelJob requires a 'ClientRunContext'");
    Assertions.assertNotNull(((ClientRunContext) input.getRunContext()).getSession(), "ModelJob requires a session");
    Assertions.assertSame(((ClientRunContext) input.getRunContext()).getSession(), input.getMutex(), "ModelJob requires the session as mutex object");
  }
}
