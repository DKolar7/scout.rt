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
package org.eclipse.scout.rt.ui.html.res.loader;

import java.io.IOException;
import java.net.URL;

import javax.servlet.http.HttpServletRequest;

import org.eclipse.scout.commons.Encoding;
import org.eclipse.scout.commons.IOUtility;
import org.eclipse.scout.commons.resource.BinaryResource;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.ui.html.cache.HttpCacheKey;
import org.eclipse.scout.rt.ui.html.cache.HttpCacheObject;
import org.eclipse.scout.rt.ui.html.cache.IHttpCacheControl;
import org.eclipse.scout.rt.ui.html.json.JsonUtility;
import org.eclipse.scout.rt.ui.html.res.IWebContentService;

/**
 * This class loads and parses JSON files from WebContent/ folder.
 */
public class JsonFileLoader extends AbstractResourceLoader {

  public JsonFileLoader(HttpServletRequest req) {
    super(req);
  }

  @Override
  public HttpCacheObject loadResource(HttpCacheKey cacheKey) throws IOException {
    String pathInfo = cacheKey.getResourcePath();
    URL url = BEANS.get(IWebContentService.class).getWebContentResource(pathInfo);
    if (url == null) {
      // not handled here
      return null;
    }
    // FIXME BSH: Maybe optimize memory consumption (unnecessary conversion of byte[] to String)
    String json = new String(IOUtility.readFromUrl(url), Encoding.UTF_8);
    json = JsonUtility.stripCommentsFromJson(json);
    BinaryResource content = new BinaryResource(pathInfo, detectContentType(pathInfo), json.getBytes(Encoding.UTF_8), System.currentTimeMillis());
    return new HttpCacheObject(cacheKey, true, IHttpCacheControl.MAX_AGE_4_HOURS, content);
  }

}
