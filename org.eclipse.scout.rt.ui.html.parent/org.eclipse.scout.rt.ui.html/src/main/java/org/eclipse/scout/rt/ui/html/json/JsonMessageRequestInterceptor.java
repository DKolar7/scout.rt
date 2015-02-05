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

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.eclipse.scout.commons.CompareUtility;
import org.eclipse.scout.commons.IOUtility;
import org.eclipse.scout.commons.annotations.Priority;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.ui.html.AbstractUiServlet;
import org.eclipse.scout.rt.ui.html.IServletRequestInterceptor;
import org.eclipse.scout.service.AbstractService;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * This interceptor contributes to the {@link AbstractUiServlet} as the default POST handler
 */
@Priority(-10)
public class JsonMessageRequestInterceptor extends AbstractService implements IServletRequestInterceptor {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(JsonMessageRequestInterceptor.class);

  @Override
  public boolean interceptGet(AbstractUiServlet servlet, HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    return false;
  }

  @Override
  public boolean interceptPost(AbstractUiServlet servlet, HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    //serve only /json
    String pathInfo = req.getPathInfo();
    if (CompareUtility.notEquals(pathInfo, "/json")) {
      LOG.info("404_NOT_FOUND_POST: " + pathInfo);
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
      return true;
    }
    try {
      //disable cache
      servlet.getHttpCacheControl().disableCacheHeaders(req, resp);

      JsonRequest jsonReq = new JsonRequest(decodeJSONRequest(req));
      if (jsonReq.isPingRequest()) {
        writeResponse(resp, createPingJsonResponse().toJson());
        return true;
      }

      IJsonSession jsonSession = getOrCreateJsonSession(servlet, req, resp, jsonReq);
      if (jsonSession == null) {
        return true;
      }

      // GUI requests for the same session must be processed consecutively
      synchronized (jsonSession) {
        JSONObject json = jsonSession.processRequest(req, jsonReq);
        writeResponse(resp, json);
      }
    }
    catch (Exception e) {
      LOG.error("Unexpected error while processing JSON request", e);
      writeErrorResponse(resp, createUnrecoverableFailureJsonResponse());
    }
    return true;
  }

  protected IJsonSession getOrCreateJsonSession(AbstractUiServlet servlet, HttpServletRequest req, HttpServletResponse resp, JsonRequest jsonReq) throws ServletException, IOException {
    String jsonSessionAttributeName = "scout.htmlui.session.json." + jsonReq.getJsonSessionId();
    HttpSession httpSession = req.getSession();

    //FIXME cgu really synchronize on this? blocks every call, maybe introduce a lock object saved on httpSession or even better use java.util.concurrent.locks.ReadWriteLock
    synchronized (httpSession) {
      IJsonSession jsonSession = (IJsonSession) httpSession.getAttribute(jsonSessionAttributeName);

      if (jsonReq.isUnloadRequest()) {
        LOG.info("Unloading JSON session with ID " + jsonReq.getJsonSessionId() + " (requested by UI)");
        if (jsonSession != null) {
          jsonSession.dispose();
          httpSession.removeAttribute(jsonSessionAttributeName);
        }
        return null;
      }

      if (jsonSession == null) {
        if (!jsonReq.isStartupRequest()) {
          LOG.info("Request cannot be processed due to JSON session timeout [id=" + jsonReq.getJsonSessionId() + "]");
          writeErrorResponse(resp, createSessionTimeoutJsonResponse());
          return null;
        }
        LOG.info("Creating new JSON session with ID " + jsonReq.getJsonSessionId() + "...");
        jsonSession = servlet.createJsonSession();
        jsonSession.init(req, new JsonStartupRequest(jsonReq));
        httpSession.setAttribute(jsonSessionAttributeName, jsonSession);
      }
      else if (jsonReq.isStartupRequest()) {
        throw new IllegalStateException("Startup requested for existing JSON session with ID " + jsonReq.getJsonSessionId());
      }
      return jsonSession;
    }
  }

  protected JsonResponse createSessionTimeoutJsonResponse() {
    JsonResponse jsonResp = new JsonResponse();
    jsonResp.setErrorCode(JsonResponse.ERR_SESSION_TIMEOUT);
    jsonResp.setErrorMessage("The session has expired, please reload the page."); // will be translated in client, see Session.js/_processErrorResponse()
    return jsonResp;
  }

  protected JsonResponse createUnrecoverableFailureJsonResponse() {
    JsonResponse jsonResp = new JsonResponse();
    jsonResp.setErrorCode(JsonResponse.ERR_UI_PROCESSING);
    jsonResp.setErrorMessage("UI processing error"); // will be translated in client, see Session.js/_processErrorResponse()
    return jsonResp;
  }

  protected JsonResponse createPingJsonResponse() {
    return new JsonResponse();
  }

  protected void writeErrorResponse(HttpServletResponse resp, JsonResponse jsonErrorResp) throws IOException {
    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    writeResponse(resp, jsonErrorResp.toJson());
  }

  protected void writeResponse(HttpServletResponse resp, JSONObject json) throws IOException {
    String jsonText = json.toString();
    byte[] data = jsonText.getBytes("UTF-8");
    resp.setContentLength(data.length);
    resp.setContentType("application/json");
    resp.setCharacterEncoding("UTF-8");
    resp.getOutputStream().write(data);
    if (LOG.isDebugEnabled()) {
      LOG.debug("Returned: " + jsonText);
    }
  }

  protected JSONObject decodeJSONRequest(HttpServletRequest req) {
    try {
      String jsonData = IOUtility.getContent(req.getReader());
      if (LOG.isDebugEnabled()) {
        LOG.debug("Received: " + jsonData);
      }
      return (jsonData == null ? new JSONObject() : new JSONObject(jsonData));
    }
    catch (ProcessingException | IOException | JSONException e) {
      throw new JsonException(e.getMessage(), e);
    }
  }
}
