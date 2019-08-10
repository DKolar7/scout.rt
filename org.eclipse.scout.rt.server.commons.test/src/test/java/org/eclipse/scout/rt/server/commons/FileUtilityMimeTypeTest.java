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
package org.eclipse.scout.rt.server.commons;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.List;

import javax.servlet.ServletContext;

import org.eclipse.scout.rt.platform.BeanMetaData;
import org.eclipse.scout.rt.platform.IBean;
import org.eclipse.scout.rt.platform.util.FileUtility;
import org.eclipse.scout.rt.testing.shared.TestingUtility;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;

/**
 * JUnit tests for {@link FileUtility#getMimeType(java.nio.file.Path)} using servlet context
 *
 * @since 5.2
 */
public class FileUtilityMimeTypeTest {

  private List<IBean<?>> beans = new ArrayList<>();

  @Before
  public void before() {
    ServletContext servletContext = Mockito.mock(ServletContext.class);
    Mockito.when(servletContext.getMimeType("file.xml")).thenReturn("application/xml");
    Mockito.when(servletContext.getMimeType("file.XML")).thenReturn("application/xml");
    Mockito.when(servletContext.getMimeType("file.m4v")).thenReturn("video/mp4");
    beans.add(TestingUtility.registerBean(new BeanMetaData(ServletContext.class, servletContext).withApplicationScoped(true)));
  }

  @After
  public void after() {
    TestingUtility.unregisterBeans(beans);
  }

  @Test
  public void testGetMimeType_xml() {
    assertEquals("text/xml", FileUtility.getMimeType("file.xml"));
  }

  @Test
  public void testGetMimeType_XML() {
    assertEquals("text/xml", FileUtility.getMimeType("file.XML"));
  }

  @Test
  public void testGetMimeType_m4v() {
    assertEquals("video/mp4", FileUtility.getMimeType("file.m4v"));
  }

  @Test
  public void testGetMimeType_invalidPath() {
    assertEquals("text/xml", FileUtility.getMimeType("*.xml"));
  }
}
