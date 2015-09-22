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
package org.eclipse.scout.rt.shared.cache;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.eclipse.scout.commons.BeanUtility;
import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.BeanMetaData;
import org.eclipse.scout.rt.platform.internal.BeanInstanceUtil;

/**
 * @since 5.2
 */
@Order(100)
public class CacheBuilder<K, V> implements ICacheBuilder<K, V> {

  // list containing created cache instances
  private final List<ICache<K, V>> m_cacheInstances;
  private final List<CustomWrapperInitializer> m_customWrappers;

  private String m_cacheId;
  private ICacheValueResolver<K, V> m_valueResolver;
  private boolean m_shared;
  private boolean m_threadSafe;
  private boolean m_clusterEnabled;
  private boolean m_transactional;
  private boolean m_transactionalFastForward;
  private boolean m_singleton;
  private Integer m_maxConcurrentResolve;

  public CacheBuilder() {
    m_cacheInstances = new ArrayList<ICache<K, V>>();
    m_customWrappers = new ArrayList<CustomWrapperInitializer>();
    m_threadSafe = true;
    m_clusterEnabled = true;
  }

  @Override
  public ICache<K, V> build() {
    if (getCacheId() == null || getValueResolver() == null) {
      throw new IllegalStateException("No cacheId or value-resolver set");
    }
    Map<K, V> cacheMap = createCacheMap();
    ICache<K, V> cache = createBasicCache(cacheMap);
    cache = addBeforeCustomWrappers(cache);
    cache = addCustomWrappers(cache);
    cache = addAfterCustomWrappers(cache);

    // before publish cache as bean, initialize all instances
    initializeCacheInstances();
    registerCacheBean(cache);
    return cache;
  }

  /**
   * When a cache instance was created, it is important, that it is added to this list. Else the instance will not be
   * initialized.
   *
   * @param cache
   * @return this builder
   */
  protected void addCacheInstance(ICache<K, V> cache) {
    m_cacheInstances.add(cache);
  }

  protected List<ICache<K, V>> getCacheInstances() {
    return Collections.unmodifiableList(m_cacheInstances);
  }

  protected Map<K, V> createCacheMap() {
    if (isThreadSafe()) {
      return new ConcurrentHashMap<K, V>();
    }
    return new HashMap<K, V>();
  }

  protected ICache<K, V> createBasicCache(Map<K, V> cacheMap) {
    BasicCache<K, V> cache = new BasicCache<K, V>(getCacheId(), getValueResolver(), cacheMap);
    addCacheInstance(cache);
    return cache;
  }

  protected ICache<K, V> addBeforeCustomWrappers(ICache<K, V> cache) {
    if (getMaxConcurrentResolve() != null) {
      cache = new BoundedResolveCacheWrapper<K, V>(cache, getMaxConcurrentResolve());
      addCacheInstance(cache);
    }
    return cache;
  }

  @SuppressWarnings("unchecked")
  protected ICache<K, V> addCustomWrappers(ICache<K, V> cache) {
    for (CustomWrapperInitializer initializer : getCustomWrappers()) {
      try {
        // take the original argument array and append at first position
        // as arguments the current cache instance
        Object[] baseArguments = initializer.getArguments();
        Object[] arguments = new Object[baseArguments.length + 1];
        System.arraycopy(baseArguments, 0, arguments, 1, baseArguments.length);
        arguments[0] = cache;
        // create the new instance
        cache = BeanUtility.createInstance(initializer.getWrapperClass(), arguments);
        addCacheInstance(cache);
      }
      catch (Exception e) {
        throw new IllegalArgumentException(String.format("Failed creating cache instance of %s", initializer), e);
      }
    }
    return cache;
  }

  protected ICache<K, V> addAfterCustomWrappers(ICache<K, V> cache) {
    return cache;
  }

  protected void initializeCacheInstances() {
    for (ICache<K, V> cache : m_cacheInstances) {
      BeanInstanceUtil.initializeInstance(cache);
    }
  }

  protected void registerCacheBean(ICache<K, V> cache) {
    BeanMetaData beanData = new BeanMetaData(ICache.class, cache);
    BEANS.getBeanManager().registerBean(beanData);
  }

  @Override
  public CacheBuilder<K, V> withCacheId(String cacheId) {
    m_cacheId = cacheId;
    return this;
  }

  public String getCacheId() {
    return m_cacheId;
  }

  @Override
  public CacheBuilder<K, V> withValueResolver(ICacheValueResolver<K, V> valueResolver) {
    m_valueResolver = valueResolver;
    return this;
  }

  public ICacheValueResolver<K, V> getValueResolver() {
    return m_valueResolver;
  }

  @Override
  public CacheBuilder<K, V> withShared(boolean shared) {
    m_shared = shared;
    return this;
  }

  public boolean isShared() {
    return m_shared;
  }

  @Override
  public CacheBuilder<K, V> withThreadSafe(boolean threadSafe) {
    m_threadSafe = threadSafe;
    return this;
  }

  public boolean isThreadSafe() {
    return m_threadSafe;
  }

  @Override
  public CacheBuilder<K, V> withClusterEnabled(boolean clusterEnabled) {
    m_clusterEnabled = clusterEnabled;
    return this;
  }

  public boolean isClusterEnabled() {
    return m_clusterEnabled;
  }

  @Override
  public CacheBuilder<K, V> withTransactional(boolean transactional) {
    m_transactional = transactional;
    return this;
  }

  public boolean isTransactional() {
    return m_transactional;
  }

  @Override
  public CacheBuilder<K, V> withTransactionalFastForward(boolean transactionalFastForward) {
    m_transactionalFastForward = transactionalFastForward;
    return this;
  }

  public boolean isTransactionalFastForward() {
    return m_transactionalFastForward;
  }

  @Override
  public CacheBuilder<K, V> withSingleton(boolean singleton) {
    m_singleton = singleton;
    return this;
  }

  public boolean isSingleton() {
    return m_singleton;
  }

  @Override
  public CacheBuilder<K, V> withMaxConcurrentResolve(Integer maxConcurrentResolve) {
    if (maxConcurrentResolve != null && maxConcurrentResolve < 0) {
      throw new IllegalArgumentException("maxConcurrentResolve cannot be negative");
    }
    m_maxConcurrentResolve = maxConcurrentResolve;
    return this;
  }

  public Integer getMaxConcurrentResolve() {
    return m_maxConcurrentResolve;
  }

  @Override
  public CacheBuilder<K, V> withAdditionalCustomWrapper(Class<? extends ICache> cacheClass, Object... arguments) {
    if (cacheClass != null) {
      m_customWrappers.add(new CustomWrapperInitializer(cacheClass, arguments));
    }
    return this;
  }

  @Override
  public void removeAdditionalCustomWrapper(Class<? extends ICache> cacheClass) {
    if (cacheClass == null) {
      return;
    }
    for (Iterator<CustomWrapperInitializer> iterator = m_customWrappers.iterator(); iterator.hasNext();) {
      CustomWrapperInitializer initializer = iterator.next();
      if (cacheClass.equals(initializer.getWrapperClass())) {
        iterator.remove();
      }
    }
  }

  /**
   * @return life list of custom wrappers; useful for subclasses
   */
  protected List<CustomWrapperInitializer> getCustomWrappers() {
    return m_customWrappers;
  }

  @Override
  public String toString() {
    return "CacheBuilder [m_cacheId=" + m_cacheId + "]";
  }

  protected static class CustomWrapperInitializer {
    private final Class<? extends ICache> m_wrapperClass;
    private final Object[] m_arguments;

    public CustomWrapperInitializer(Class<? extends ICache> wrapperClass, Object[] arguments) {
      super();
      m_wrapperClass = wrapperClass;
      m_arguments = arguments;
    }

    public Class<? extends ICache> getWrapperClass() {
      return m_wrapperClass;
    }

    public Object[] getArguments() {
      return m_arguments;
    }

    @Override
    public String toString() {
      return "CustomWrapperInitializer [m_wrapperClass=" + m_wrapperClass + ", m_arguments=" + Arrays.toString(m_arguments) + "]";
    }
  }
}
