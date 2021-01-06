/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.platform.util;

import static org.eclipse.scout.rt.platform.util.CollectionUtility.*;
import static org.junit.Assert.*;

import java.io.Serializable;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;

import org.eclipse.scout.rt.platform.reflect.ReflectionUtility;
import org.eclipse.scout.rt.testing.platform.util.ScoutAssert;
import org.junit.Test;

public class ReflectionUtilityTest {

  @Test
  public void testGetInterfaces() {
    assertEquals(emptyHashSet(), hashSet(ReflectionUtility.getInterfaces(Object.class)));
    assertEquals(hashSet(Runnable.class), hashSet(ReflectionUtility.getInterfaces(Runnable.class)));
    assertEquals(hashSet(Callable.class), hashSet(ReflectionUtility.getInterfaces(Callable.class)));
    assertEquals(hashSet(Callable.class), hashSet(ReflectionUtility.getInterfaces(Callable.class)));
    assertEquals(emptyHashSet(), hashSet(ReflectionUtility.getInterfaces(Top.class)));
    assertEquals(hashSet(Runnable.class, Serializable.class), hashSet(ReflectionUtility.getInterfaces(Middle.class)));
    assertEquals(hashSet(Callable.class, Runnable.class, Serializable.class), hashSet(ReflectionUtility.getInterfaces(Bottom.class)));
  }

  @Test
  public void testConstructor() {
    assertNotNull(ReflectionUtility.getConstructor(Bottom.class, new Class<?>[]{String.class, Integer.class}));
    assertNull(ReflectionUtility.getConstructor(Bottom.class, new Class<?>[]{Integer.class, String.class}));
  }

  @Test
  public void testGetAllFields() throws Exception {
    List<Field> expectedFields = CollectionUtility.arrayList(Top.class.getDeclaredFields());
    ScoutAssert.assertListEquals(expectedFields, ReflectionUtility.getAllFields(Top.class));
    expectedFields.addAll(0, Arrays.asList(Middle.class.getDeclaredFields()));
    ScoutAssert.assertListEquals(expectedFields, ReflectionUtility.getAllFields(Middle.class));
    expectedFields.addAll(0, Arrays.asList(Bottom.class.getDeclaredFields()));
    ScoutAssert.assertListEquals(expectedFields, ReflectionUtility.getAllFields(Bottom.class));
  }

  // === Test classes ===

  public static class Top {
  }

  public static class Middle extends Top implements Runnable, Serializable {

    private static final long serialVersionUID = 1L;

    @SuppressWarnings("unused")
    private Top m_parent = null;

    @Override
    public void run() {
    }
  }

  public static class Bottom extends Middle implements Callable {

    private static final long serialVersionUID = 1L;

    @SuppressWarnings("unused")
    private Top m_child = null;

    public Bottom(String string, Integer integer) {
    }

    @Override
    public Object call() throws Exception {
      return null;
    }
  }
}
