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
package org.eclipse.scout.rt.platform.internal;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.LinkedHashMap;

import javax.annotation.PostConstruct;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.platform.BeanCreationException;

public final class BeanInstanceUtil {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(BeanInstanceUtil.class);

  private BeanInstanceUtil() {

  }

  public static <T> T create(Class<T> beanClazz) {
    T instance = null;
    try {
      instance = Assertions.assertNotNull(newInstance(beanClazz));
      instance = initializeInstance(instance);
    }
    catch (Throwable t) {
      if (LOG.isInfoEnabled()) {
        LOG.info(String.format("Cannot create new instance of '%s'.", beanClazz), t);
      }
      if (t instanceof Error) {
        throw (Error) t;
      }
      else if (t instanceof RuntimeException) {
        throw (RuntimeException) t;
      }
      else {
        throw new BeanCreationException(beanClazz == null ? null : beanClazz.getName(), t);
      }
    }
    return instance;
  }

  public static <T> T newInstance(Class<T> clazz) throws Throwable {
    try {
      Constructor<T> cons = clazz.getDeclaredConstructor();
      cons.setAccessible(true);
      return cons.newInstance();
    }
    catch (InvocationTargetException e) {
      throw e.getCause();
    }
  }

  public static <T> T initializeInstance(T instance) {
    // post instantiate
    callPostConstruct(instance);
    return instance;
  }

  /**
   * @param instance
   */
  private static void callPostConstruct(Object instance) {
    LinkedHashMap<String /*method name*/, Method> collector = new LinkedHashMap<>();
    collectPostConstructRec(instance.getClass(), collector);
    for (Method method : collector.values()) {
      try {
        if (method.getParameterTypes().length == 0) {
          method.setAccessible(true);
          method.invoke(instance);
        }
        else {
          throw new IllegalArgumentException(String.format("Methods with @PostConstruct must have no arguments. See '%s' on '%s',", method.getName(), method.getDeclaringClass().getName()));
        }
      }
      catch (Exception e) {
        LOG.error(String.format("Could not call initialze method '%s' on '%s'.", method.getName(), instance.getClass()));
      }
    }

  }

  private static void collectPostConstructRec(Class<?> clazz, LinkedHashMap<String /*method name*/, Method> outMap) {
    if (clazz == null || Object.class.getName().equals(clazz.getName())) {
      return;
    }
    for (Method m : clazz.getDeclaredMethods()) {
      if (m.getAnnotation(PostConstruct.class) != null) {
        String name = overrideDistinctiveMethodName(m);
        if (!outMap.containsKey(name)) {
          outMap.put(name, m);
        }
      }
    }
    collectPostConstructRec(clazz.getSuperclass(), outMap);
  }

  private static String overrideDistinctiveMethodName(Method m) {
    Assertions.assertNotNull(m);
    if (Modifier.isPrivate(m.getModifiers())) {
      return m.getDeclaringClass().getName() + ":" + m.getName();
    }
    return m.getName();

  }
}
