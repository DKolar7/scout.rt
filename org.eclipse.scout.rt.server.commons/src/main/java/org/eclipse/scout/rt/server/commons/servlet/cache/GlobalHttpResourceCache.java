/*
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.server.commons.servlet.cache;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.IPlatform.State;
import org.eclipse.scout.rt.platform.IPlatformListener;
import org.eclipse.scout.rt.platform.Platform;
import org.eclipse.scout.rt.platform.PlatformEvent;

/**
 * A {@link HttpResourceCache} used for global resources. This class holds a single {@link HttpResourceCache} instance.
 * <br>
 * Resources added to this cache will never be removed until the Scout {@link Platform} stops.
 */
@ApplicationScoped
public class GlobalHttpResourceCache implements IPlatformListener, IHttpResourceCache {
  private final HttpResourceCache m_resourceCache = BEANS.get(HttpResourceCache.class);

  @Override
  public boolean put(HttpCacheObject obj) {
    return getResourceCache().put(obj);
  }

  @Override
  public HttpCacheObject get(HttpCacheKey cacheKey) {
    return getResourceCache().get(cacheKey);
  }

  @Override
  public HttpCacheObject remove(HttpCacheKey cacheKey) {
    return getResourceCache().remove(cacheKey);
  }

  @Override
  public void clear() {
    getResourceCache().clear();
  }

  protected HttpResourceCache getResourceCache() {
    return m_resourceCache;
  }

  @Override
  public void stateChanged(PlatformEvent event) {
    if (event.getState() == State.PlatformStopping) {
      clear();
    }
  }
}
