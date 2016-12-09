/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the BSI CRM Software License v1.0
 * which accompanies this distribution as bsi-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.selenium.util;

import java.io.File;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import org.apache.commons.exec.OS;
import org.eclipse.scout.rt.platform.util.ObjectUtility;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.json.JSONObject;
import org.openqa.selenium.Capabilities;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Point;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeDriverService;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

public class SeleniumDriver {

  private static void logProperty(String property, String value) {
    System.out.println("set property '" + property + "': " + ObjectUtility.nvl(value, "[not set]"));
  }

  public static WebDriver setUpDriver() {
    // web-driver executable
    String webdriverChromeDriver = System.getProperty(ChromeDriverService.CHROME_DRIVER_EXE_PROPERTY);
    if (StringUtility.isNullOrEmpty(webdriverChromeDriver)) {
      webdriverChromeDriver = OS.isFamilyWindows() ? "/seleniumDrivers/chromedriver.exe" : "/seleniumDrivers/chromedriver";
    }

    File chromeDriver = new File(webdriverChromeDriver);
    if (!chromeDriver.exists()) {
      System.out.println("Chrome driver executable not found at path: " + chromeDriver);
      URL webdriverChromeDriverResource = SeleniumDriver.class.getResource(webdriverChromeDriver);
      if (webdriverChromeDriverResource != null) {
        chromeDriver = new File(webdriverChromeDriverResource.getFile());
        webdriverChromeDriver = chromeDriver.getAbsolutePath();
      }
    }
    if (!StringUtility.matches(webdriverChromeDriver, ".+\\.exe", Pattern.CASE_INSENSITIVE) && chromeDriver.exists() && !chromeDriver.canExecute()) {
      chromeDriver.setExecutable(true);
    }

    System.setProperty(ChromeDriverService.CHROME_DRIVER_EXE_PROPERTY, webdriverChromeDriver);
    logProperty(ChromeDriverService.CHROME_DRIVER_EXE_PROPERTY, webdriverChromeDriver);

    // log-file for web-driver
    File tmpDir = new File(System.getProperty("java.io.tmpdir"));
    File logFile = new File(tmpDir, "webdriver.log");
    String logFilePath = logFile.getAbsolutePath();
    System.setProperty(ChromeDriverService.CHROME_DRIVER_LOG_PROPERTY, logFilePath);
    logProperty(ChromeDriverService.CHROME_DRIVER_LOG_PROPERTY, logFilePath);

    // set web-driver in verbose mode
    System.setProperty(ChromeDriverService.CHROME_DRIVER_VERBOSE_LOG_PROPERTY, "true");
    logProperty(ChromeDriverService.CHROME_DRIVER_VERBOSE_LOG_PROPERTY, "true");

    ChromeOptions options = new ChromeOptions();
    String chromeBinary = System.getProperty("chrome.binary");
    logProperty("chrome.binary", chromeBinary);
    if (StringUtility.hasText(chromeBinary)) {
      options.setBinary(chromeBinary);
    }
    options.addArguments("--lang=en");
    options.addArguments("--verbose");

    // FIXME BSH Remove workaround, when Chrome bug is fixed
    // <WORKAROUND> https://bugs.chromium.org/p/chromedriver/issues/detail?id=1552
    Map<String, String> env = new HashMap<>();
    env.put("LANG", "en_US.UTF-8");
    System.out.println("Using custom environment variables for driver: " + new JSONObject(env).toString(2));
    RemoteWebDriver driver = new ChromeDriver(
        new ChromeDriverService.Builder()
            .usingAnyFreePort()
            .withEnvironment(env) // <--
            .build(),
        options);
    //RemoteWebDriver driver = new ChromeDriver(options);
    // </WORKAROUND>

    driver.manage().timeouts().setScriptTimeout(10000, TimeUnit.SECONDS);
    // Set window size roughly to the minimal supported screen size
    // (1280x1024 minus some borders for browser toolbar and windows taskbar)
    driver.manage().window().setPosition(new Point(0, 0));
    driver.manage().window().setSize(new Dimension(1200, 900));

    Capabilities caps = driver.getCapabilities();
    System.out.println("Selenium driver configured with driver=" + driver.getClass().getName()
        + " browser.name=" + caps.getBrowserName()
        + " browser.version=" + caps.getVersion());
    return driver;
  }
}
