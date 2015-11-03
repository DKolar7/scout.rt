/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.res.loader;

import java.io.IOException;

import javax.servlet.http.HttpServletRequest;

import org.eclipse.scout.commons.Encoding;
import org.eclipse.scout.commons.resource.BinaryResource;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.ui.html.UiThemeUtility;
import org.eclipse.scout.rt.ui.html.cache.HttpCacheKey;
import org.eclipse.scout.rt.ui.html.cache.HttpCacheObject;
import org.eclipse.scout.rt.ui.html.cache.IHttpCacheControl;
import org.eclipse.scout.rt.ui.html.res.IWebContentService;
import org.eclipse.scout.rt.ui.html.script.ScriptFileBuilder;
import org.eclipse.scout.rt.ui.html.script.ScriptOutput;
import org.eclipse.scout.rt.ui.html.scriptprocessor.ScriptProcessor;

/**
 * This class loads and parses CSS and JS files from WebContent/ folder.
 */
public class ScriptFileLoader extends AbstractResourceLoader {

  private ScriptProcessor m_scriptProcessor;

  public ScriptFileLoader(HttpServletRequest req, ScriptProcessor scriptProcessor) {
    super(req);
    m_scriptProcessor = scriptProcessor;
  }

  @Override
  public HttpCacheObject loadResource(HttpCacheKey cacheKey) throws IOException {
    ScriptFileBuilder builder = new ScriptFileBuilder(BEANS.get(IWebContentService.class), m_scriptProcessor);
    builder.setMinifyEnabled(isMinify());
    builder.setTheme(UiThemeUtility.getThemeForLookup(getRequest()));
    String resourcePath = cacheKey.getResourcePath();
    ScriptOutput out = builder.buildScript(resourcePath);
    if (out != null) {
      BinaryResource content = new BinaryResource(out.getPathInfo(), detectContentType(resourcePath), Encoding.UTF_8, out.getContent(), out.getLastModified());
      return new HttpCacheObject(cacheKey, true, IHttpCacheControl.MAX_AGE_ONE_YEAR, content);
    }
    return null;
  }

}
