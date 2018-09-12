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
package org.eclipse.scout.rt.client.job.filter.future;

import java.util.function.Predicate;

import org.eclipse.scout.rt.client.job.ModelJobs;
import org.eclipse.scout.rt.platform.job.IFuture;

/**
 * Filter to accept Futures which belong to model jobs.
 *
 * @since 5.2
 */
public final class ModelJobFutureFilter implements Predicate<IFuture<?>> {

  public static final Predicate<IFuture<?>> INSTANCE = new ModelJobFutureFilter();

  private ModelJobFutureFilter() {
  }

  @Override
  public boolean test(final IFuture<?> future) {
    return ModelJobs.isModelJob(future);
  }
}
