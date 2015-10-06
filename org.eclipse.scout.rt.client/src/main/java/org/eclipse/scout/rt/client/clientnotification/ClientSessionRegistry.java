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
package org.eclipse.scout.rt.client.clientnotification;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.CompareUtility;
import org.eclipse.scout.commons.IRunnable;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.client.IClientSession;
import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.config.CONFIG;
import org.eclipse.scout.rt.shared.SharedConfigProperties.NotificationSubjectProperty;
import org.eclipse.scout.rt.shared.clientnotification.IClientNotificationService;
import org.eclipse.scout.rt.shared.services.common.ping.IPingService;
import org.eclipse.scout.rt.shared.servicetunnel.IServiceTunnel;
import org.eclipse.scout.rt.shared.session.IGlobalSessionListener;
import org.eclipse.scout.rt.shared.session.SessionEvent;
import org.eclipse.scout.rt.shared.ui.UserAgent;

public class ClientSessionRegistry implements IClientSessionRegistry, IGlobalSessionListener {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(ClientSessionRegistry.class);

  /**
   * Subject for server calls for client notification related updates.
   */
  protected final Subject NOTIFICATION_SUBJECT = CONFIG.getPropertyValue(NotificationSubjectProperty.class);

  private Object m_cacheLock = new Object();
  private final Map<String /*sessionId*/, WeakReference<IClientSession>> m_sessionIdToSession = new HashMap<>();
  private final Map<String /*userId*/, List<WeakReference<IClientSession>>> m_userToSessions = new HashMap<>();

  @Override
  public void register(IClientSession session, String sessionId) {
    synchronized (m_cacheLock) {
      m_sessionIdToSession.put(sessionId, new WeakReference<IClientSession>(session));
    }
    // if the client session is already started, otherwise the listener will invoke the clientSessionStated method.
    if (BEANS.get(IServiceTunnel.class).isActive() && session.isActive()) {
      sessionStarted(session);
    }
  }

  /**
   * this method is expected to be called in the context of the specific session.
   *
   * @param session
   */
  protected void sessionStopped(final IClientSession session) {
    checkSession(session);
    final String sessionId = session.getId();
    final String userId = session.getUserId();
    LOG.debug(String.format("Unregister client session [sessionid=%s, userId=%s].", sessionId, userId));

    // unregister user remote
    try {
      ClientRunContexts.empty().withSubject(NOTIFICATION_SUBJECT).withUserAgent(UserAgent.createDefault()).run(new IRunnable() {
        @Override
        public void run() throws Exception {
          BEANS.get(IClientNotificationService.class).unregisterSession(NOTIFICATION_NODE_ID, sessionId, userId);
        }
      });
    }
    catch (ProcessingException e) {
      LOG.warn(String.format("Could not unregister session[%s] for remote notifications.", session), e);
    }
    // client session household
    synchronized (m_cacheLock) {
      m_sessionIdToSession.remove(session.getId());
      List<WeakReference<IClientSession>> userSessions = m_userToSessions.get(userId);
      if (userSessions != null) {
        for (Iterator<WeakReference<IClientSession>> it = userSessions.iterator(); it.hasNext();) {
          WeakReference<IClientSession> ref = it.next();
          IClientSession clientSession = ref.get();
          if (clientSession == null || CompareUtility.equals(clientSession.getId(), session.getId())) {
            it.remove();
          }
        }
        if (userSessions.isEmpty()) {
          m_userToSessions.remove(userId);
        }
      }
    }
  }

  /**
   * Register the session after session start. This method is expected to be called in the context of the specific
   * session.
   *
   * @param session
   */
  public void sessionStarted(final IClientSession session) {
    ensureUserIdAvailable(session);
    checkSession(session);
    LOG.debug(String.format("Register client session [sessionid=%s, userId=%s].", session.getId(), session.getUserId()));
    registerOnClient(session);
    registerOnServer(session);
  }

  private void checkSession(final IClientSession session) {
    Assertions.assertNotNull(session.getId(), "No sessionId available");
    Assertions.assertNotNull(session.getUserId(), "No userId available");
  }

  private void registerOnServer(final IClientSession session) {
    try {
      ClientRunContexts.empty().withSubject(NOTIFICATION_SUBJECT).withUserAgent(UserAgent.createDefault()).run(new IRunnable() {
        @Override
        public void run() throws Exception {
          BEANS.get(IClientNotificationService.class).registerSession(NOTIFICATION_NODE_ID, session.getId(), session.getUserId());
        }
      });
    }
    catch (ProcessingException e) {
      LOG.warn(String.format("Could not register session[%s] for remote notifications.", session), e);
    }
  }

  /**
   * local linking
   */
  private void registerOnClient(final IClientSession session) {
    synchronized (m_cacheLock) {
      List<WeakReference<IClientSession>> sessionRefs = m_userToSessions.get(session.getUserId());
      if (sessionRefs != null) {
        // clean cache
        boolean toBeAdded = true;
        Iterator<WeakReference<IClientSession>> sessionRefIt = sessionRefs.iterator();
        while (sessionRefIt.hasNext()) {
          WeakReference<IClientSession> sessionRef = sessionRefIt.next();
          if (sessionRef.get() == null) {
            sessionRefIt.remove();
          }
          else if (sessionRef.get() == session) {
            // already registered
            toBeAdded = false;
          }
        }
        if (toBeAdded) {
          sessionRefs.add(new WeakReference<>(session));
        }
      }
      else {
        sessionRefs = new LinkedList<>();
        sessionRefs.add(new WeakReference<>(session));
        m_userToSessions.put(session.getUserId(), sessionRefs);
      }
    }
  }

  /**
   * Make sure, the userid is set on the session. A first server-lookup creates the server session and synchronized the
   * userid.
   */
  protected void ensureUserIdAvailable(IClientSession session) {
    BEANS.get(IPingService.class).ping("ensure shared context is loaded...");
  }

  @Override
  public IClientSession getClientSession(String sessionid) {
    synchronized (m_cacheLock) {
      WeakReference<IClientSession> sessionRef = m_sessionIdToSession.get(sessionid);
      if (sessionRef != null && sessionRef.get() != null) {
        return sessionRef.get();
      }
      else {
        m_sessionIdToSession.remove(sessionid);
      }
    }
    return null;
  }

  @Override
  public List<IClientSession> getClientSessionsForUser(String userId) {
    List<IClientSession> result = new LinkedList<>();
    synchronized (m_cacheLock) {
      List<WeakReference<IClientSession>> userSessions = m_userToSessions.get(userId);
      if (userSessions == null) {
        if (isCurrentSession(userId)) {
          return CollectionUtility.arrayList((IClientSession) IClientSession.CURRENT.get());
        }
        else {
          LOG.error("No session found for user " + userId);
          return CollectionUtility.emptyArrayList();
        }
      }

      Iterator<WeakReference<IClientSession>> refIt = userSessions.iterator();
      while (refIt.hasNext()) {
        WeakReference<IClientSession> sessionRef = refIt.next();
        if (sessionRef.get() != null) {
          result.add(sessionRef.get());
        }
        else {
          refIt.remove();
        }
      }
    }
    return result;
  }

  protected boolean isCurrentSession(String userId) {
    IClientSession currentSession = (IClientSession) IClientSession.CURRENT.get();
    return currentSession != null && CompareUtility.equals(currentSession.getUserId(), userId);
  }

  @Override
  public List<IClientSession> getAllClientSessions() {
    List<IClientSession> result = new LinkedList<IClientSession>();
    synchronized (m_cacheLock) {
      for (Entry<String, WeakReference<IClientSession>> e : m_sessionIdToSession.entrySet()) {
        if (e.getValue().get() != null) {
          result.add(e.getValue().get());
        }
        else {
          m_sessionIdToSession.remove(e.getKey());
        }
      }
    }
    return result;
  }

  @Override
  public void sessionChanged(SessionEvent event) {
    if (!BEANS.get(IServiceTunnel.class).isActive()) {
      return;
    }
    switch (event.getType()) {
      case SessionEvent.TYPE_STARTED:
        sessionStarted((IClientSession) event.getSource());
        break;
      case SessionEvent.TYPE_STOPPED:
        sessionStopped((IClientSession) event.getSource());
      default:
        break;
    }
  }

}
