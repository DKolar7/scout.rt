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
package org.eclipse.scout.service;

/**
 * Default implementation for service initialization.
 *
 * @see DefaultServiceInitializer
 */
//TODO dwi this class, DefaultServiceInitializer, and IServiceInitializer, and AbstractService.init... sind das nicht ein paar dinge im kreis rum? (imo)
public class DefaultServiceInitializerFactory implements IServiceInitializerFactory {

  @Override
  public IServiceInitializer createInstance(IService rawService) {
    return new DefaultServiceInitializer();
  }

}
