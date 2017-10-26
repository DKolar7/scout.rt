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
package org.eclipse.scout.rt.ui.html.json;

import static org.junit.Assert.assertEquals;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.BeanMetaData;
import org.eclipse.scout.rt.platform.IBean;
import org.eclipse.scout.rt.platform.IgnoreBean;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.util.IOUtility;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.testing.platform.runner.PlatformTestRunner;
import org.eclipse.scout.rt.testing.shared.TestingUtility;
import org.eclipse.scout.rt.ui.html.ResourceBase;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(PlatformTestRunner.class)
public class DefaultValuesFilterServiceTest {

  private List<IBean<IDefaultValuesConfigurationContributor>> m_origBeans = new ArrayList<>();
  private DefaultValuesFilter m_origFilter;
  private List<IBean<?>> m_newBeans = new ArrayList<>();

  @Before
  public void setUp() {
    // Make sure filter is initialized anew by setting it to null so that contributors are gathered again
    m_origFilter = BEANS.get(DefaultValuesFilterService.class).getFilter();
    BEANS.get(DefaultValuesFilterService.class).setFilter(null);

    m_origBeans = BEANS.getBeanManager().getBeans(IDefaultValuesConfigurationContributor.class);
    TestingUtility.unregisterBeans(m_origBeans);
    m_newBeans.add(TestingUtility.registerBean(new BeanMetaData(OverrideOriginalContributor.class)));
    m_newBeans.add(TestingUtility.registerBean(new BeanMetaData(OverrideContributor.class)));
  }

  @After
  public void tearDown() {
    TestingUtility.unregisterBeans(m_newBeans);
    for (IBean<?> bean : m_origBeans) {
      TestingUtility.registerBean(new BeanMetaData(bean.getBeanClazz()));
    }

    // Restore original filter
    BEANS.get(DefaultValuesFilterService.class).setFilter(m_origFilter);
  }

  protected String readFile(String filename) throws IOException {
    try (InputStream in = ResourceBase.class.getResourceAsStream(filename)) {
      return IOUtility.readStringUTF8(in);
    }
  }

  protected JSONObject readJsonFile(String filename) throws IOException {
    return new JSONObject(JsonUtility.stripCommentsFromJson(readFile(filename)));
  }

  @Test
  public void testOverride() throws Exception {
    String expected = StringUtility.trim(readFile("json/DefaultValuesFilterServiceTest_defaults_override_expected.json"));
    String actual = BEANS.get(DefaultValuesFilterService.class).getCombinedDefaultValuesConfiguration();
    assertEquals(expected, actual);
  }

  @Order(1000)
  @IgnoreBean
  public static class OverrideOriginalContributor implements IDefaultValuesConfigurationContributor {

    @Override
    public URL contributeDefaultValuesConfigurationUrl() {
      return ResourceBase.class.getResource("json/DefaultValuesFilterServiceTest_defaults_override_original.json");
    }

  }

  @Order(100)
  @IgnoreBean
  public static class OverrideContributor implements IDefaultValuesConfigurationContributor {

    @Override
    public URL contributeDefaultValuesConfigurationUrl() {
      return ResourceBase.class.getResource("json/DefaultValuesFilterServiceTest_defaults_override.json");
    }

  }
}
