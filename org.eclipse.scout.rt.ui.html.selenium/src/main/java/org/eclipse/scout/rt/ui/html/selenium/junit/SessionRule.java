/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the BSI CRM Software License v1.0
 * which accompanies this distribution as bsi-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.selenium.junit;

import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.ui.html.selenium.annotation.UrlParams;
import org.eclipse.scout.rt.ui.html.selenium.util.SeleniumUtil;
import org.junit.rules.TestWatcher;
import org.junit.runner.Description;
import org.openqa.selenium.WebDriver;

/**
 * Test rule to control login/logout for selenium tests.
 * <p>
 * This is <i>not</i> realized as @Before/@After methods, because this would not allow us to control the execution order
 * of the various test rules, namely the {@link ScreenshotRule}, which would take the screenshot too late (after
 * logout).
 */
public class SessionRule extends TestWatcher {

  private final WebDriver m_driver;

  public SessionRule(AbstractSeleniumTest test) {
    m_driver = test.getDriver();
  }

  @Override
  protected void starting(Description description) {
    // Before each test method, ensure a new session is created.
    String webAppUrl = SeleniumUtil.getWebAppUrl();
    if (description.getTestClass().isAnnotationPresent(UrlParams.class)) {
      String urlParams = description.getTestClass().getAnnotation(UrlParams.class).value();
      if (!StringUtility.isNullOrEmpty(urlParams)) {
        webAppUrl = webAppUrl + "?" + urlParams;
      }
    }
    m_driver.get(webAppUrl);
  }

  @Override
  protected void finished(Description description) {
    // After each test-method, call the logout URL to destroy the current session
    // (without creating a new one automatically)
    m_driver.get(SeleniumUtil.getLogoutUrl());
  }
}
