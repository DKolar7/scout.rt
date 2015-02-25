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
package org.eclipse.scout.net;

import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.ProxySelector;

import org.eclipse.scout.commons.ConfigIniUtility;
import org.eclipse.scout.rt.platform.IModule;

/**
 * Extension to the org.eclipse.core.net to support JAAS based net
 * authentications using a {@link NetPrincipal}.
 * <p>
 * Calling {@link #install()} resp. activating this bundle will install
 * <li>pre eclipse 3.6 auto proxy handling using {@link EclipseProxySelector} into java.net.ProxySelector</li>
 * <li>an {@link EclipseAuthenticator} wrapper into java.net.Authenticator that will delegate to the
 * org.eclipse.core.net.authenticator extension (if not null) else to the osgi service of type java.net.Authenticator</li>
 * <li>installs the default java 1.6 {@link CookieManager} if there is no {@link CookieHandler} installed yet</li>
 * <p>
 * Note: this class is only used until https://bugs.eclipse.org/bugs/show_bug.cgi?id=299756 and
 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=257443 are solved.
 * <p>
 * Use init property (config.ini, system properties, etc.) with name java.net.authenticate.cache.enabled=true|false to
 * allow/disallow caching of passwords. This property may/should be queried by {@link Authenticator} ui implementations
 * to decide whether to show/not show a checkbox or something simliar to save the passwords.
 * <p/>
 * Use org.eclipse.scout.net.proxy.autodetect=false to disable proxy detection
 */
public final class NetModule implements IModule {
  public static boolean DEBUG;
  public static boolean PROXY_AUTODETECTION;

  private CookieHandler m_oldCookieHandler;
  private CookieHandler m_newCookieHandler;
  private ProxySelector m_oldProxySelector;
  private ProxySelector m_newProxySelector;

  @SuppressWarnings("deprecation")
  @Override
  public void start() {
    String debugText = ConfigIniUtility.getProperty("org.eclipse.scout.net" + ".debug");
    DEBUG = (debugText != null && debugText.equalsIgnoreCase("true"));

    String proxyDetectionText = ConfigIniUtility.getProperty("org.eclipse.scout.net" + ".proxy.autodetect");
    PROXY_AUTODETECTION = (proxyDetectionText == null || proxyDetectionText.equalsIgnoreCase("true"));

    // setup java.net
    m_oldProxySelector = ProxySelector.getDefault();
    m_oldCookieHandler = CookieHandler.getDefault();
    if (PROXY_AUTODETECTION) {
      ProxySelector.setDefault(m_newProxySelector = new EclipseProxySelector());
    }
    CookieManager.setDefault(m_newCookieHandler = new CookieManager(null, CookiePolicy.ACCEPT_ALL));
    Authenticator.setDefault(new EclipseAuthenticator());
  }

  @Override
  public void stop() {
    Authenticator.setDefault(null);
    if (ProxySelector.getDefault() == m_newProxySelector) {
      ProxySelector.setDefault(m_oldProxySelector);
    }
    if (CookieHandler.getDefault() == m_newCookieHandler) {
      CookieHandler.setDefault(m_oldCookieHandler);
    }
    m_oldProxySelector = null;
    m_newProxySelector = null;
    m_oldCookieHandler = null;
    m_newCookieHandler = null;
  }

}
