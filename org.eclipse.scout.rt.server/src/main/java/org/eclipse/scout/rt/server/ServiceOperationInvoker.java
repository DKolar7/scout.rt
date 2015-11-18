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
package org.eclipse.scout.rt.server;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.exception.VetoException;
import org.eclipse.scout.commons.serialization.SerializationUtility;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.RunMonitor;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.service.IService;
import org.eclipse.scout.rt.server.admin.inspector.CallInspector;
import org.eclipse.scout.rt.server.admin.inspector.ProcessInspector;
import org.eclipse.scout.rt.server.admin.inspector.SessionInspector;
import org.eclipse.scout.rt.server.session.ServerSessionProvider;
import org.eclipse.scout.rt.server.transaction.ITransaction;
import org.eclipse.scout.rt.shared.ScoutTexts;
import org.eclipse.scout.rt.shared.security.RemoteServiceAccessPermission;
import org.eclipse.scout.rt.shared.services.common.security.ACCESS;
import org.eclipse.scout.rt.shared.servicetunnel.RemoteServiceAccessDenied;
import org.eclipse.scout.rt.shared.servicetunnel.ServiceTunnelRequest;
import org.eclipse.scout.rt.shared.servicetunnel.ServiceTunnelResponse;
import org.eclipse.scout.rt.shared.servicetunnel.ServiceUtility;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Provides functionality to invoke service operations as described by {@link ServiceTunnelRequest} and to return the
 * operations result in the form of a {@link ServiceTunnelResponse}.
 */
@ApplicationScoped
public class ServiceOperationInvoker {
  private static final Logger LOG = LoggerFactory.getLogger(ServiceOperationInvoker.class);

  public static final Pattern DEFAULT_QUERY_NAMES_PATTERN = Pattern.compile("(get|is|has|load|read|find|select)([A-Z].*)?");
  public static final Pattern DEFAULT_PROCESS_NAMES_PATTERN = Pattern.compile("(set|put|add|remove|store|write|create|insert|update|delete)([A-Z].*)?");

  public ServiceTunnelResponse invoke(ServiceTunnelRequest serviceReq) throws Exception {
    long t0 = System.nanoTime();

    ServiceTunnelResponse response;
    try {
      response = invokeImpl(serviceReq);
    }
    catch (Throwable t) {
      ITransaction.CURRENT.get().addFailure(t);
      handleException(t, serviceReq);
      response = new ServiceTunnelResponse(interceptException(t));
    }

    long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);
    if (LOG.isDebugEnabled()) {
      LOG.debug("TIME {}.{} {}ms", new Object[]{serviceReq.getServiceInterfaceClassName(), serviceReq.getOperation(), elapsedMillis});
    }
    response.setProcessingDuration(elapsedMillis);
    return response;
  }

  /**
   * This method is executed within a {@link IServerSession} context on behalf of a server job.
   */
  protected ServiceTunnelResponse invokeImpl(ServiceTunnelRequest serviceReq) throws Throwable {
    IServerSession serverSession = ServerSessionProvider.currentSession();
    String authenticatedUser = serverSession.getUserId();
    if (LOG.isDebugEnabled()) {
      LOG.debug("started " + serviceReq.getServiceInterfaceClassName() + "." + serviceReq.getOperation() + " by " + authenticatedUser + " at " + new Date());
    }
    CallInspector callInspector = getCallInspector(serviceReq, serverSession);
    ServiceUtility serviceUtility = BEANS.get(ServiceUtility.class);
    ServiceTunnelResponse serviceRes = null;
    try {
      //do checks
      Class<?> serviceInterfaceClass = SerializationUtility.getClassLoader().loadClass(serviceReq.getServiceInterfaceClassName());
      Method serviceOp = serviceUtility.getServiceOperation(serviceInterfaceClass, serviceReq.getOperation(), serviceReq.getParameterTypes());
      Object[] args = serviceReq.getArgs();
      checkServiceAccess(serviceInterfaceClass, serviceOp, args);
      Object service = BEANS.get(serviceInterfaceClass);

      Object data = serviceUtility.invoke(serviceOp, service, args);
      Object[] outParameters = serviceUtility.extractHolderArguments(args);

      serviceRes = new ServiceTunnelResponse(data, outParameters);
      return serviceRes;
    }
    finally {
      if (callInspector != null) {
        try {
          callInspector.update();
        }
        catch (Throwable t) {
          LOG.warn(null, t);
        }
        try {
          callInspector.close(serviceRes);
        }
        catch (Throwable t) {
          LOG.warn(null, t);
        }
        try {
          callInspector.getSessionInspector().update();
        }
        catch (Throwable t) {
          LOG.warn(null, t);
        }
      }
    }
  }

  /**
   * Check, if the service can be accessed
   */
  protected void checkServiceAccess(Class<?> serviceInterfaceClass, Method serviceOp, Object[] args) {
    Object service = BEANS.opt(serviceInterfaceClass);
    checkServiceAvailable(serviceInterfaceClass, service);
    checkRemoteServiceAccessByInterface(serviceInterfaceClass, serviceOp, args);
    checkRemoteServiceAccessByAnnotations(serviceInterfaceClass, service.getClass(), serviceOp, args);
    checkRemoteServiceAccessByPermission(serviceInterfaceClass, service.getClass(), serviceOp, args);
  }

  /**
   * Check, if an instance is available
   */
  protected void checkServiceAvailable(Class<?> serviceInterfaceClass, Object service) {
    if (service == null) {
      throw new SecurityException("service registry does not contain a service of type " + serviceInterfaceClass.getName());
    }
  }

  /**
   * Check pass 1 on type
   */
  protected void checkRemoteServiceAccessByInterface(Class<?> interfaceClass, Method interfaceMethod, Object[] args) {
    //check: must be an interface
    if (!interfaceClass.isInterface()) {
      throw new SecurityException("access denied (code 1a).");
    }

    //check: method is defined on service interface itself
    Method verifyMethod;
    try {
      verifyMethod = interfaceClass.getMethod(interfaceMethod.getName(), interfaceMethod.getParameterTypes());
    }
    catch (Throwable t) {
      throw new SecurityException("access denied (code 1c).");
    }
    //exists
    if (verifyMethod.getDeclaringClass() == IService.class) {
      throw new SecurityException("access denied (code 1d).");
    }
    //continue
  }

  /**
   * Check pass 2 on instance
   */
  protected void checkRemoteServiceAccessByAnnotations(Class<?> interfaceClass, Class<?> implClass, Method interfaceMethod, Object[] args) {
    //check: grant/deny annotation (type level is base, method level is finegrained)
    Class<?> c = implClass;
    while (c != null) {
      //method level
      Method m = null;
      try {
        m = c.getMethod(interfaceMethod.getName(), interfaceMethod.getParameterTypes());
      }
      catch (Throwable t) {
        //nop
      }
      if (m != null) {
        Annotation[] methodAnnotations = m.getAnnotations();
        for (Annotation ann : methodAnnotations) {
          if (ann.annotationType() == RemoteServiceAccessDenied.class) {
            throw new SecurityException("access denied (code 2b).");
          }
        }
      }
      //type level
      Annotation[] classAnnotations = c.getAnnotations();
      for (Annotation ann : classAnnotations) {
        if (ann.annotationType() == RemoteServiceAccessDenied.class) {
          throw new SecurityException("access denied (code 2c).");
        }
      }
      //next
      if (c == interfaceClass) {
        break;
      }
      c = c.getSuperclass();
      if (c == Object.class) {
        //use interface at last
        c = interfaceClass;
      }
    }
    //continue
  }

  /**
   * Check pass 3 {@link RemoteServiceAccessPermission} if a client (gui) is allowed to call this service from remote
   * using a remote service proxy.
   * <p>
   * Deny access by default.
   * <p>
   * Accepts when a {@link RemoteServiceAccessPermission} was implied.
   */
  protected void checkRemoteServiceAccessByPermission(Class<?> interfaceClass, Class<?> implClass, Method interfaceMethod, Object[] args) {
    if (ACCESS.check(new RemoteServiceAccessPermission(interfaceClass.getName(), interfaceMethod.getName()))) {
      return;
    }
    throw new SecurityException("access denied (code 3a).");
  }

  private CallInspector getCallInspector(ServiceTunnelRequest serviceReq, IServerSession serverSession) {
    SessionInspector sessionInspector = BEANS.get(ProcessInspector.class).getSessionInspector(serverSession, true);
    if (sessionInspector != null) {
      return sessionInspector.requestCallInspector(serviceReq);
    }
    return null;
  }

  /**
   * Method invoked to handle a service exception.
   */
  protected void handleException(Throwable t, ServiceTunnelRequest serviceTunnelRequest) {
    if (RunMonitor.CURRENT.get().isCancelled()) {
      return;
    }

    String serviceOperation = String.format("service=%s, method=%s", serviceTunnelRequest.getServiceInterfaceClassName(), serviceTunnelRequest.getOperation());
    if (t instanceof ProcessingException) {
      ProcessingException pe = (ProcessingException) t;
      pe.addContextMessage(serviceOperation);
      BEANS.get(ExceptionHandler.class).handle(pe);
    }
    else {
      LOG.error(String.format("Unexpected error while invoking service operation [%s]", serviceOperation), t);
    }
  }

  /**
   * Method invoked to intercept a service exception before being put into the {@link ServiceTunnelResponse} to be sent
   * to the client.
   * <p>
   * Security: do not send back original error and stack trace with implementation details.<br/>
   * The default implementation returns an empty exception, or in case of a {@link VetoException} only its title,
   * message, htmlMessage, error code and severity.
   */
  protected Throwable interceptException(Throwable t) {
    Throwable p;
    if (t instanceof VetoException) {
      VetoException ve = (VetoException) t;
      p = new VetoException(ve.getStatus().getTitle(), ve.getStatus().getBody(), ve.getHtmlBody(), null, ve.getStatus().getCode(), ve.getStatus().getSeverity());
    }
    else {
      p = new ProcessingException(ScoutTexts.get("RequestProblem"));
    }
    p.setStackTrace(new StackTraceElement[0]);
    return p;
  }
}
