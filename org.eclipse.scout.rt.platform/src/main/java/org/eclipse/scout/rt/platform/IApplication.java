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
package org.eclipse.scout.rt.platform;

import org.eclipse.scout.commons.annotations.Priority;
import org.eclipse.scout.rt.platform.cdi.Bean;

/**
 * The application with the highest {@link Priority} will be launched in the {@link IPlatform.State#ApplicationStarting}
 * phase
 */
@Bean
public interface IApplication {

  void start() throws PlatformException;

  void stop() throws PlatformException;
}
