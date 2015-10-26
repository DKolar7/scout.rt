package org.eclipse.scout.rt.server.commons.servlet.logging;

import javax.servlet.http.HttpServletRequest;

import org.eclipse.scout.commons.logger.internal.slf4j.DiagnosticContextValueProcessor;
import org.eclipse.scout.commons.logger.internal.slf4j.DiagnosticContextValueProcessor.IDiagnosticContextValueProvider;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.server.commons.servlet.IHttpServletRoundtrip;
import org.slf4j.MDC;

/**
 * This class provides the {@link HttpServletRequest#getRequestURI()} to be set into the
 * <code>diagnostic context map</code> for logging purpose.
 *
 * @see #KEY
 * @see DiagnosticContextValueProcessor
 * @see MDC
 * @since 5.1
 */
@ApplicationScoped
public class HttpRequestMethodContextValueProvider implements IDiagnosticContextValueProvider {

  public static final String KEY = "http.request.uri";

  @Override
  public String key() {
    return KEY;
  }

  @Override
  public String value() {
    return IHttpServletRoundtrip.CURRENT_HTTP_SERVLET_REQUEST.get().getRequestURI();
  }
}
