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
package org.eclipse.scout.rt.server.jaxws.provider.annotation;

import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import javax.jws.WebService;
import javax.xml.ws.WebServiceClient;

import org.eclipse.scout.rt.platform.IPlatform;
import org.eclipse.scout.rt.platform.context.RunContext;
import org.eclipse.scout.rt.server.context.ServerRunContext;
import org.eclipse.scout.rt.server.jaxws.provider.auth.authenticator.ConfigFileAuthenticator;
import org.eclipse.scout.rt.server.jaxws.provider.auth.authenticator.IAuthenticator;
import org.eclipse.scout.rt.server.jaxws.provider.auth.handler.AuthenticationHandler;
import org.eclipse.scout.rt.server.jaxws.provider.auth.method.BasicAuthenticationMethod;
import org.eclipse.scout.rt.server.jaxws.provider.auth.method.IAuthenticationMethod;

/**
 * Annotate an interface with this annotation, if you like to generate a PortTypProxy for a webservice provider. A
 * PortTypeProxy implements all methods of a webservice and makes webservice requests to run on behalf of a
 * {@link ServerRunContext}, before being propagated to the Bean implementing the port type interface. Also,
 * installation of authentication and JAX-WS handlers is facilitated.
 * <p>
 * Any annotation added to the interface is added to the proxy as well. That also applies for {@link WebService}
 * annotation to overwrite values derived from WSDL. If you provide an explicit handler-chain binding file, handlers and
 * authentication declared on this annotation are ignored.
 * <p>
 * The binding to the concrete webservice is done by {@link #belongsToPortType()} attribute. If a WSDL declares multiple
 * services, create a separate decorator interface for each service to be provided, and distinguish the proxy's name by
 * {@link #portTypeProxyName()} attribute.
 *
 * @since 5.1
 */
@Target(java.lang.annotation.ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Inherited
public @interface JaxWsPortTypeProxy {

  public static final String DERIVED = "derived";

  /**
   * The 'port type name' as specified in the WSDL file to generate a PortTypeProxy for.
   *
   * <pre>
   * &lt;wsdl:portType name="PORT_TYPE_NAME"&gt;
   *   ...
   * &lt;/wsdl:operation&gt;
   * </pre>
   */
  String belongsToPortType();

  /**
   * The class name of the PortTypeProxy to be generated. If not set, the name is derived from the PortType interface
   * suffixed with 'Proxy'.
   */
  String portTypeProxyName() default JaxWsPortTypeProxy.DERIVED;

  /**
   * The service name as specified in the WSDL file, and must be set if publishing a webservice in J2EE container.
   * Both, {@link #serviceName()} and {@link #portName()}, uniquely identify a webservice endpoint to be published.
   *
   * <pre>
   * &lt;wsdl:service name="SERVICE_NAME">
   *  ...
   * &lt;/wsdl:service&gt
   * </pre>
   */
  String serviceName() default "";

  /**
   * The name of the port as specified in the WSDL file, and must be set if publishing a webservice in J2EE container.
   * Both, {@link #serviceName()} and {@link #portName()}, uniquely identify a webservice endpoint to be published.
   *
   * <pre>
   * &lt;wsdl:service name="...">
   *  &lt;wsdl:port name="PORT_NAME" binding="..."/&gt;
   * &lt;/wsdl:service&gt
   * </pre>
   */
  String portName() default "";

  /**
   * The location of the WSDL document. If not set, the location is derived from {@link WebServiceClient} annotation
   * which is typically initialized with the location provided to 'wsimport'.
   */
  String wsdlLocation() default JaxWsPortTypeProxy.DERIVED;

  /**
   * The authentication mechanism to be installed on the webservice endpoint, and to specify in which {@link RunContext}
   * to run authenticated webservice requests. By default, {@link BasicAuthenticationMethod} with
   * {@link ConfigFileAuthenticator} is used. Authentication can be disabled by setting <i>enabled</i> to
   * <code>false</code>. If <i>enabled</i>, an {@link AuthenticationHandler} is generated at compile time (APT)
   * and registered in the handler chain as very first handler.
   * <ul>
   * <li>The {@link IAuthenticator} can be configured to run in a {@link RunContext} by annotating it with
   * <code>&#064;RunWithRunContext</code> annotation.</li>
   * <li>The {@link IAuthenticationMethod} and {@link IAuthenticator} must not be visible at compile-time, but can be
   * referenced with their qualified names instead.</li>
   * <li>At runtime, {@link IAuthenticationMethod} and {@link IAuthenticator} are resolved by the {@link IPlatform},
   * meaning that they must be annotated with <code>&#064;ApplicationScoped</code>.</li>
   * <li>If providing a handler binding file yourself, this annotation is ignored.</li>
   * </ul>
   */
  Authentication authentication() default @Authentication();

  /**
   * To specify JAX-WS handlers to be installed on the webservice endpoint in the order as being declared. Thereto, for
   * each handler, a proxy handler is created at compile-time and registered in 'handler-chain.xml'.
   * <ul>
   * <li>A handler can be configured to run in a {@link RunContext} by annotating it with
   * <code>&#064;RunWithRunContext</code> annotation.</li>
   * <li>A handler can be instrumented with <i>init-params</i>.</li>
   * <li>A handler must not be visible at compile-time, but can be referenced with its qualified name instead.</li>
   * <li>At runtime, handlers are resolved by the {@link IPlatform}, meaning that a handler must be annotated with
   * <code>&#064;ApplicationScoped</code></li>
   * <li>If providing a handler binding file yourself, this annotation is ignored.</li>
   * </ul>
   */
  Handler[] handlerChain() default {};
}
