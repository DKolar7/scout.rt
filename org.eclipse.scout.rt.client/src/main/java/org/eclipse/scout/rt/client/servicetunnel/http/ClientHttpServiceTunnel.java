/*******************************************************************************
 * Copyright (c) 2013 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.servicetunnel.http;

import java.net.URL;
import java.security.PrivilegedAction;
import java.util.List;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.IRunnable;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.client.IClientSession;
import org.eclipse.scout.rt.client.clientnotification.ClientNotificationDispatcher;
import org.eclipse.scout.rt.client.clientnotification.IClientSessionRegistry;
import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.client.job.ClientJobs;
import org.eclipse.scout.rt.client.services.common.perf.IPerformanceAnalyzerService;
import org.eclipse.scout.rt.client.session.ClientSessionProvider;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.RunContext;
import org.eclipse.scout.rt.platform.job.DoneEvent;
import org.eclipse.scout.rt.platform.job.IBlockingCondition;
import org.eclipse.scout.rt.platform.job.IDoneCallback;
import org.eclipse.scout.rt.platform.job.Jobs;
import org.eclipse.scout.rt.shared.ISession;
import org.eclipse.scout.rt.shared.OfflineState;
import org.eclipse.scout.rt.shared.clientnotification.ClientNotificationMessage;
import org.eclipse.scout.rt.shared.services.common.offline.IOfflineDispatcherService;
import org.eclipse.scout.rt.shared.servicetunnel.ServiceTunnelRequest;
import org.eclipse.scout.rt.shared.servicetunnel.ServiceTunnelResponse;
import org.eclipse.scout.rt.shared.servicetunnel.http.AbstractHttpServiceTunnel;

/**
 * Client-side tunnel used to invoke a service through HTTP. This class re-defines methods of it's super class
 * since the internal class does not belong to the public API.
 */
public class ClientHttpServiceTunnel extends AbstractHttpServiceTunnel implements IClientServiceTunnel {

  private static final IScoutLogger LOG = ScoutLogManager.getLogger(ClientHttpServiceTunnel.class);

  private boolean m_analyzeNetworkLatency = true;

  public ClientHttpServiceTunnel() {
    super();
  }

  public ClientHttpServiceTunnel(URL url) {
    super(url);
  }

  @Override
  public boolean isAnalyzeNetworkLatency() {
    return m_analyzeNetworkLatency;
  }

  @Override
  public void setAnalyzeNetworkLatency(boolean b) {
    m_analyzeNetworkLatency = b;
  }

  @Override
  protected void beforeTunnel(ServiceTunnelRequest serviceRequest) {
    ISession session = IClientSession.CURRENT.get();
    if (session != null) {
      serviceRequest.setSessionId(session.getId());
    }
    serviceRequest.setClientNotificationNodeId(IClientSessionRegistry.NOTIFICATION_NODE_ID);
  }

  @Override
  protected void afterTunnel(long t0, ServiceTunnelResponse serviceResponse) {
    if (isAnalyzeNetworkLatency()) {
      // performance analyzer
      IPerformanceAnalyzerService perf = BEANS.opt(IPerformanceAnalyzerService.class);
      if (perf != null) {
        long totalMillis = (System.nanoTime() - t0) / 1000000L;
        Long execMillis = serviceResponse.getProcessingDuration();
        if (execMillis != null) {
          perf.addNetworkLatencySample(totalMillis - execMillis);
          perf.addServerExecutionTimeSample(execMillis);
        }
        else {
          perf.addNetworkLatencySample(totalMillis);
        }
      }
    }

    // process piggyback client notifications.
    try {
      dispatchClientNotifications(serviceResponse.getNotifications());
    }
    catch (ProcessingException e) {
      LOG.error("Error during processing piggyback client notifictions.", e);
    }
  }

  /**
   * dispatch notifications in a client job and ensure to wait for dispatched notifications
   *
   * @param notifications
   *          the notifications to dispatch
   * @throws ProcessingException
   */
  protected void dispatchClientNotifications(final List<ClientNotificationMessage> notifications) throws ProcessingException {
    if (CollectionUtility.isEmpty(notifications)) {
      return;
    }
    final IBlockingCondition cond = Jobs.getJobManager().createBlockingCondition("Suspend request processing thread during client notification handling.", true);
    ClientJobs.schedule(new IRunnable() {
      @Override
      public void run() throws Exception {
        ClientNotificationDispatcher notificationDispatcher = BEANS.get(ClientNotificationDispatcher.class);
        notificationDispatcher.dispatchNotifications(notifications);
      }
    }).whenDone(new IDoneCallback<Void>() {
      @Override
      public void onDone(DoneEvent<Void> event) {
        cond.setBlocking(false);
      }
    });
    cond.waitFor();
  }

  @Override
  protected ServiceTunnelResponse tunnel(ServiceTunnelRequest serviceRequest) {
    if (OfflineState.isOfflineInCurrentThread()) {
      return tunnelOffline(serviceRequest);
    }
    else {
      return tunnelOnline(serviceRequest);
    }
  }

  protected ServiceTunnelResponse tunnelOnline(final ServiceTunnelRequest serviceRequest) {
    return super.tunnel(serviceRequest);
  }

  /**
   * Default for offline handling
   */
  protected ServiceTunnelResponse tunnelOffline(final ServiceTunnelRequest serviceRequest) {
    IClientSession clientSession = ClientSessionProvider.currentSession();
    if (clientSession != null && clientSession.getOfflineSubject() != null) {
      Object response = Subject.doAs(clientSession.getOfflineSubject(), new PrivilegedAction<ServiceTunnelResponse>() {
        @Override
        public ServiceTunnelResponse run() {
          return BEANS.get(IOfflineDispatcherService.class).dispatch(serviceRequest);
        }
      });
      return (ServiceTunnelResponse) response;
    }
    else {
      return BEANS.get(IOfflineDispatcherService.class).dispatch(serviceRequest);
    }
  }

  @Override
  protected RunContext createCurrentRunContext() {
    return ClientRunContexts.copyCurrent();
  }
}
