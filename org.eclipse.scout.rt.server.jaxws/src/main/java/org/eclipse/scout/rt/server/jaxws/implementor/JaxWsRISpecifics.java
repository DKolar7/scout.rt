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
package org.eclipse.scout.rt.server.jaxws.implementor;

import java.io.Closeable;
import java.lang.reflect.Proxy;

import javax.annotation.PostConstruct;

import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * JAX-WS implementor specifics of 'JAX-WS Reference Implementation' as contained in JDK.
 *
 * @since 5.1
 */
public class JaxWsRISpecifics extends JaxWsImplementorSpecifics {

  private static final Logger LOG = LoggerFactory.getLogger(JaxWsRISpecifics.class);

  @Override
  @PostConstruct
  protected void initConfig() {
    super.initConfig();
    m_properties.put(PROP_SOCKET_CONNECT_TIMEOUT, "com.sun.xml.internal.ws.connect.timeout");
    m_properties.put(PROP_SOCKET_READ_TIMEOUT, "com.sun.xml.internal.ws.request.timeout");
  }

  @Override
  public String getVersionInfo() {
    try {
      final Class<?> versionClass = Class.forName("com.sun.xml.internal.ws.util.RuntimeVersion");
      final String version = versionClass.getDeclaredField("VERSION").get(null).toString();

      return String.format("%s (http://jax-ws.java.net, %s, bundled with JRE)", version, versionClass.getPackage().getImplementationVendor());
    }
    catch (final ClassNotFoundException e) {
      throw new PlatformException("Application configured to run with JAX-WS RI (bundled with JRE), but implementor could not be found on classpath.");
    }
    catch (final ReflectiveOperationException e) {
      LOG.warn("Failed to read version information of JAX-WS implementor", e);
      return "JAX-WS RI bundled with JRE";
    }
  }

  @Override
  public void closeSocket(final Object port, final String operation) {
    try {
      ((Closeable) Proxy.getInvocationHandler(port)).close();
    }
    catch (final Throwable e) {
      LOG.error(String.format("Failed to close Socket for: %s", operation), e);
    }
  }
}
