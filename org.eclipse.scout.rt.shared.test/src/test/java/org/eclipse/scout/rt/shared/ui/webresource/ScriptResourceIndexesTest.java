/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.shared.ui.webresource;

import static java.util.Arrays.asList;
import static org.junit.Assert.assertEquals;

import java.net.URL;
import java.util.HashSet;
import java.util.stream.Stream;

import org.eclipse.scout.rt.shared.ui.webresource.FileListParser.FileListEntry;
import org.junit.Test;

public class ScriptResourceIndexesTest {

  @Test
  public void testDev() {
    String themeDark = "widgets-theme-dark.css";
    String vendorsWidgetsLoginLogout = "vendors~widgets-module~login~logout.js";
    String widgetsLoginLogout = "widgets-module~login~logout.js";
    String login = "login.js";
    String widgets = "widgets-module.js";
    String vendorsWidgets = "vendors~widgets-module.js";
    ScriptResourceIndexes indexes = createIndexesForFileListLines(
        themeDark,
        "widgets-theme.css",
        widgetsLoginLogout,
        widgets,
        login,
        "logout.js",
        vendorsWidgets,
        vendorsWidgetsLoginLogout);

    assertEquals(new HashSet<>(asList(widgetsLoginLogout, login, vendorsWidgetsLoginLogout)), indexes.getAssets("login", true));
    assertEquals(new HashSet<>(asList(widgets, widgetsLoginLogout, vendorsWidgets, vendorsWidgetsLoginLogout)), indexes.getAssets("widgets-module", false));
  }

  @Test
  public void testProd() {
    String themeDark = "widgets-theme-dark-abc1c9b44e8e42702061.min.css";
    String vendorsAsset1 = "vendors~widgets~login~logout-546ee42899f2ccc6205f.min.js";
    String vendorsAsset2 = "vendors~widgets-945482a5b2d8d312fd1b.min.js";
    String loginAsset = "login-1db4f970039af71104cb.min.js";
    String loginLogoutAsset = "login~logout-8862c78025b29bca5767.min.js";
    String widgetsAsset = "widgets-3b5331af613bf5a7803d.min.js";
    ScriptResourceIndexes indexes = createIndexesForFileListLines(
        widgetsAsset,
        "widgets-theme-c80da972b730c67a11ed.min.css",
        themeDark,
        loginAsset,
        loginLogoutAsset,
        "logout-8ca5e0149d7ab33f4f20.min.js",
        vendorsAsset1,
        vendorsAsset2);

    assertEquals(themeDark, indexes.toMinifiedPath("widgets-theme-dark.css"));
    assertEquals(vendorsAsset1, indexes.toMinifiedPath("vendors~widgets~login~logout.js"));
    assertEquals(new HashSet<>(asList(vendorsAsset1, loginAsset, loginLogoutAsset)), indexes.getAssets("login", true));
    assertEquals(new HashSet<>(asList(vendorsAsset1, vendorsAsset2, widgetsAsset)), indexes.getAssets("widgets", false));
  }

  protected ScriptResourceIndexes createIndexesForFileListLines(String... inputLines) {
    return new ScriptResourceIndexes() {
      @Override
      public Stream<FileListEntry> getFileListEntries(boolean minified) {
        return FileListParserTest.createParserForLines(inputLines).parse((URL) null);
      }
    };
  }
}
