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
package org.eclipse.scout.rt.platform.exception;

import java.util.concurrent.CancellationException;

import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.exception.IProcessingStatus;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.exception.VetoException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.platform.ApplicationScoped;

/**
 * {@code ExceptionHandler} is the central point for handling exceptions.
 */
@ApplicationScoped
public class ExceptionHandler {

  private static final IScoutLogger LOG = ScoutLogManager.getLogger(ExceptionHandler.class);

  /**
   * Method invoked to handle the given {@code Throwable}. This method must not throw an exception.
   */
  public void handle(final Throwable t) {
    final Throwable rootCause = ExceptionHandler.getRootCause(t);
    if (rootCause instanceof InterruptedException) {
      handleInterruptedException((InterruptedException) rootCause);
    }
    else if (rootCause instanceof CancellationException) {
      handleCancelledException((CancellationException) rootCause);
    }
    else if (t instanceof ProcessingException) {
      final ProcessingException pe = (ProcessingException) t;
      if (!pe.isConsumed()) {
        try {
          handleProcessingException(pe);
        }
        finally {
          pe.consume();
        }
      }
    }
    else {
      handleThrowable(t);
    }
  }

  /**
   * Method invoked to handle a {@code InterruptedException}. The default implementation does nothing.
   */
  protected void handleInterruptedException(final InterruptedException e) {
    if (LOG.isDebugEnabled()) {
      LOG.debug("Interruption", e);
    }
  }

  /**
   * Method invoked to handle a {@code CancellationException}. The default implementation does nothing. Typically, this
   * exception is thrown if waiting for a job to complete, but the job was cancelled.
   */
  protected void handleCancelledException(final CancellationException e) {
    if (LOG.isDebugEnabled()) {
      LOG.debug("Cancellation", e);
    }
  }

  /**
   * Method invoked to handle a {@code ProcessingException}.<br/>
   * The default implementation logs the exception according to the severity of the status. In the case of a
   * {@code VetoException}, only it's message is logged as <code>INFO</code>.
   */
  protected void handleProcessingException(final ProcessingException e) {
    final IProcessingStatus status = e.getStatus();

    if (e instanceof VetoException) {
      LOG.info("{}:{}", e.getClass().getSimpleName(), status);
    }
    else {
      switch (status.getSeverity()) {
        case IProcessingStatus.INFO:
        case IProcessingStatus.OK:
          LOG.info("", e);
          break;
        case IProcessingStatus.WARNING:
          LOG.warn("", e);
          break;
        default:
          LOG.error("", e);
          break;
      }
    }
  }

  /**
   * Method invoked to handle a {@code Throwable} which is not of the type {@code ProcessingException} or
   * {@code InterruptedException}.<br/>
   * The default implementation logs the throwable as <code>ERROR</code>.
   */
  protected void handleThrowable(final Throwable t) {
    final String message = String.format("%s:%s", t.getClass().getSimpleName(), StringUtility.nvl(t.getMessage(), "n/a"));
    LOG.error(message, t);
  }

  /**
   * Helper method to get the exception's root cause.
   */
  public static Throwable getRootCause(final Throwable e) {
    if (e.getCause() != null) {
      return ExceptionHandler.getRootCause(e.getCause());
    }
    return e;
  }
}
