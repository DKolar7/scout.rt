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
package org.eclipse.scout.rt.platform.exception;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.UndeclaredThrowableException;
import java.util.concurrent.ExecutionException;

import org.eclipse.scout.rt.platform.util.concurrent.FutureCancelledError;

/**
 * Exception handler to return the {@link Throwable} as given.
 * <p>
 * Also, if given a wrapped exception like {@link UndeclaredThrowableException}, {@link InvocationTargetException} or
 * {@link ExecutionException}, that exception is returned as given without unwrapping its cause.
 * <p>
 * For instance, this translator can be used if working with the Job API, e.g. to distinguish between a
 * {@link FutureCancelledError} thrown by the job's runnable, or because the job was effectively cancelled.
 *
 * @since 5.2
 */
public class NullExceptionTranslator implements IExceptionTranslator<Throwable> {

  @Override
  public Throwable translate(final Throwable throwable) {
    return throwable;
  }
}
