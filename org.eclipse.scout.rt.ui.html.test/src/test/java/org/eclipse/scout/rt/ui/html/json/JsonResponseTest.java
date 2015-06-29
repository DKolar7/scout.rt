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
package org.eclipse.scout.rt.ui.html.json;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import org.eclipse.scout.rt.client.testenvironment.TestEnvironmentClientSession;
import org.eclipse.scout.rt.testing.client.runner.ClientTestRunner;
import org.eclipse.scout.rt.testing.client.runner.RunWithClientSession;
import org.eclipse.scout.rt.testing.platform.runner.RunWithSubject;
import org.eclipse.scout.rt.ui.html.json.fixtures.UiSessionMock;
import org.eclipse.scout.rt.ui.html.json.testing.JsonTestUtility;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;

@RunWith(ClientTestRunner.class)
@RunWithSubject("default")
@RunWithClientSession(TestEnvironmentClientSession.class)
public class JsonResponseTest {

  UiSessionMock m_uiSession = new UiSessionMock();

  @Test
  public void testJsonEventPropertyChangeEvent() throws JSONException {
    // Check empty response
    JSONObject json = m_uiSession.currentJsonResponse().toJson();

    assertNotNull(json);
    JSONArray events = json.optJSONArray(JsonResponse.PROP_EVENTS);
    assertEquals(null, events);

    // Check single property change event
    final String testId = "ID007";
    final String testPropName = "a stränge prøpertÿ name";
    final String testValue = "#";
    m_uiSession.currentJsonResponse().addPropertyChangeEvent(testId, testPropName, testValue);
    json = m_uiSession.currentJsonResponse().toJson();

    assertNotNull(json);
    events = json.getJSONArray(JsonResponse.PROP_EVENTS);
    assertEquals(1, events.length());

    JSONObject event = events.getJSONObject(0);
    assertEquals(testId, event.get("target"));
    assertEquals("property", event.get("type"));
    JSONObject props = event.getJSONObject("properties");
    assertNotNull(props);
    assertEquals(1, props.length());
    assertEquals(testPropName, props.keys().next());
    Object value = props.get(testPropName);
    assertEquals(testValue, value);
  }

  /**
   * Property with the value null get converted to "" (empty string)
   */
  @Test
  public void testJsonEventPropertyNullToEmptyString() throws JSONException {
    m_uiSession.currentJsonResponse().addPropertyChangeEvent("-1", "name", null);
    JSONObject json = m_uiSession.currentJsonResponse().toJson();
    JSONArray events = json.getJSONArray(JsonResponse.PROP_EVENTS);
    JSONObject props = events.getJSONObject(0).getJSONObject("properties");
    assertEquals(props.get("name"), "");
  }

  @Test
  public void testDoAddEvent_PropertyChange() throws Exception {
    // when m_adapterMap does not contain the ID 'foo', property change should be added
    JsonResponse resp = new JsonResponse();
    resp.addPropertyChangeEvent("foo", "name", "andre");
    JSONObject json = resp.toJson();
    JSONObject propertyChange = JsonTestUtility.getPropertyChange(json, 0);
    assertEquals("andre", propertyChange.getString("name"));

    // when m_adapterMap contains the ID 'foo', property change must be removed
    IJsonAdapter<?> mockAdapter = Mockito.mock(IJsonAdapter.class);
    Mockito.when(mockAdapter.getId()).thenReturn("foo");
    resp.addAdapter(mockAdapter);
    json = resp.toJson();
    assertEquals(null, json.optJSONArray(JsonResponse.PROP_EVENTS));
  }

}
