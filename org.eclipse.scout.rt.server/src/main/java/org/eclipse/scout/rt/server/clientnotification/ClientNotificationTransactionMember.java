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
package org.eclipse.scout.rt.server.clientnotification;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.server.commons.servlet.IHttpServletRoundtrip;
import org.eclipse.scout.rt.server.context.ServerRunContext;
import org.eclipse.scout.rt.server.transaction.AbstractTransactionMember;
import org.eclipse.scout.rt.shared.clientnotification.ClientNotificationMessage;

/**
 * This transaction member is used to collect all transactional notifications issued during a transaction.
 * On successful commit, the notifications will be added to the
 * {@link ServerRunContext#getTransactionalClientNotificationCollector()
 * )} to be included in the request's response (piggyback). That allows immediate processing of the transactional
 * notifications on client side.
 */
public class ClientNotificationTransactionMember extends AbstractTransactionMember {

  public static final String TRANSACTION_MEMBER_ID = "clientNotification.transactionMemberId";

  private final List<ClientNotificationMessage> m_notifications = new ArrayList<>();
  private final ClientNotificationCoalescer m_coalescer;
  private final ClientNotificationRegistry m_notificationRegistry;

  public ClientNotificationTransactionMember(ClientNotificationRegistry reg) {
    super(TRANSACTION_MEMBER_ID);
    m_notificationRegistry = reg;
    m_coalescer = BEANS.get(ClientNotificationCoalescer.class);
  }

  @Override
  public void rollback() {
    m_notifications.clear();
  }

  @Override
  public void cancel() {
    m_notifications.clear();
  }

  @Override
  public boolean needsCommit() {
    return !m_notifications.isEmpty();
  }

  public void addNotification(ClientNotificationMessage message) {
    m_notifications.add(message);
  }

  @Override
  public void commitPhase2() {
    List<ClientNotificationMessage> coalescedNotifications = m_coalescer.coalesce(new ArrayList<>(m_notifications));
    publish(coalescedNotifications);
    m_notifications.clear();
  }

  private void publish(List<ClientNotificationMessage> coalescedNotifications) {
    if (isPiggyBackPossible()) {
      preparePiggyBack(coalescedNotifications);
      m_notificationRegistry.publish(coalescedNotifications, getCurrentUiNodeId());
    }
    else {
      m_notificationRegistry.publish(coalescedNotifications);
    }
  }

  /**
   * Register client notifications of the current transaction in the collector to be included in the service response
   * (piggyback).
   */
  private void preparePiggyBack(List<ClientNotificationMessage> notifications) {
    TransactionalClientNotificationCollector.CURRENT.get().addAll(notifications);
  }

  /**
   * Piggyback of client notifications with the current request is only possible, if a response is still available (not
   * called in a separate server job)
   */
  private boolean isPiggyBackPossible() {
    return IHttpServletRoundtrip.CURRENT_HTTP_SERVLET_RESPONSE.get() != null && ClientNotificationNodeId.get() != null;
  }

  private String getCurrentUiNodeId() {
    return Assertions.assertNotNull(ClientNotificationNodeId.CURRENT.get(), "No 'notification node id' found on current calling context");
  }

}
