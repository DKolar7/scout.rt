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
package org.eclipse.scout.rt.platform.job.filter.future;

import org.eclipse.scout.commons.CompareUtility;
import org.eclipse.scout.commons.filter.IFilter;
import org.eclipse.scout.rt.platform.job.IFuture;

/**
 * Filter which accepts all Futures that belong to the given mutex object.
 *
 * @since 5.1
 */
public class MutexFutureFilter implements IFilter<IFuture<?>> {

  private final Object m_mutexObject;

  public MutexFutureFilter(final Object mutexObject) {
    m_mutexObject = mutexObject;
  }

  @Override
  public boolean accept(final IFuture<?> future) {
    return CompareUtility.equals(m_mutexObject, future.getJobInput().getMutex());
  }
}
