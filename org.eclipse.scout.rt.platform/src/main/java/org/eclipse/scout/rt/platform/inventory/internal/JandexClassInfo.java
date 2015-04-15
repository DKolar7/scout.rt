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
package org.eclipse.scout.rt.platform.inventory.internal;

import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.platform.inventory.IClassInfo;
import org.jboss.jandex.ClassInfo;

/**
 *
 */
public class JandexClassInfo implements IClassInfo {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(JandexClassInfo.class);
  private final ClassInfo m_classInfo;
  private volatile Class<?> m_class;

  public JandexClassInfo(ClassInfo classInfo) {
    Assertions.assertNotNull(classInfo);
    m_classInfo = classInfo;
  }

  @Override
  public String name() {
    return m_classInfo.name().toString();
  }

  @Override
  public int flags() {
    return m_classInfo.flags();
  }

  protected void ensureClassLoaded() {
    if (m_class == null) {
      synchronized (this) {
        if (m_class == null) {
          try {
            m_class = Class.forName(name());
          }
          catch (ClassNotFoundException ex) {
            throw new PlatformException("Error loading class '" + name() + "' with flags 0x" + Integer.toHexString(flags()), ex);
          }
        }
      }
    }
  }

  protected boolean hasNoArgsConstructor(Class<?> c) {
    for (Constructor<?> a : c.getConstructors()) {
      if (a.getParameterTypes().length == 0) {
        return true;
      }
    }
    return false;
  }

  @Override
  public Class<?> resolveClass() {
    ensureClassLoaded();
    return m_class;
  }

  @Override
  public boolean isInstanciable() {
    if (isAbstract() || isInterface() || !isPublic()) {
      return false;
    }

    try {
      Class<?> clazz = resolveClass();
      // top level or static inner
      if (clazz.isMemberClass() && !Modifier.isStatic(clazz.getModifiers())) {
        return false;
      }
    }
    catch (Exception ex) {
      LOG.warn("loading class", ex);
      return false;
    }
    return true;
  }

  @Override
  public boolean isPublic() {
    return Modifier.isPublic(flags());
  }

  @Override
  public boolean isFinal() {
    return Modifier.isFinal(flags());
  }

  @Override
  public boolean isInterface() {
    return Modifier.isInterface(flags());
  }

  @Override
  public boolean isAbstract() {
    return Modifier.isAbstract(flags());
  }

  @Override
  public boolean isSynthetic() {
    return (flags() & ACC_SYNTHETIC) != 0;
  }

  @Override
  public boolean isAnnotation() {
    return (flags() & ACC_ANNOTATION) != 0;
  }

  @Override
  public boolean isEnum() {
    return (flags() & ACC_ENUM) != 0;
  }

  @Override
  public String toString() {
    return m_classInfo.toString();
  }

  @Override
  public int hashCode() {
    return m_classInfo.hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null) {
      return false;
    }
    if (!(obj instanceof JandexClassInfo)) {
      return false;
    }
    JandexClassInfo other = (JandexClassInfo) obj;
    if (m_classInfo == null) {
      if (other.m_classInfo != null) {
        return false;
      }
    }
    else if (!m_classInfo.equals(other.m_classInfo)) {
      return false;
    }
    return true;
  }
}
