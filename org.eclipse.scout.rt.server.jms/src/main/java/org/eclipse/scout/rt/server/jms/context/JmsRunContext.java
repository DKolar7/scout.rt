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
package org.eclipse.scout.rt.server.jms.context;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;

import javax.jms.Message;
import javax.security.auth.Subject;

import org.eclipse.scout.commons.ToStringBuilder;
import org.eclipse.scout.commons.nls.NlsLocale;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.RunContext;
import org.eclipse.scout.rt.platform.context.RunMonitor;
import org.eclipse.scout.rt.platform.context.internal.InitThreadLocalCallable;
import org.eclipse.scout.rt.platform.job.PropertyMap;

/**
 * The <code>JmsRunContext</code> facilitates propagation of the <i>JMS Java Message Service</i> state. This context is
 * not intended to be propagated across different threads.
 * <p/>
 * A context typically represents a "snapshot" of the current calling state. This class facilitates propagation of that
 * state.
 * <p/>
 * The 'setter-methods' returns <code>this</code> in order to support for method chaining. The context has the following
 * characteristics:
 * <ul>
 * <li>{@link Subject}</li>
 * <li>{@link NlsLocale#CURRENT}</li>
 * <li>{@link PropertyMap#CURRENT}</li>
 * </ul>
 *
 * @since 5.1
 * @see RunContext
 */
public class JmsRunContext extends RunContext {

  /**
   * The {@link Message} which is currently associated with the current thread.
   */
  public static final ThreadLocal<Message> CURRENT_JMS_MESSAGE = new ThreadLocal<>();

  protected Message m_jmsMessage;

  @Override
  protected <RESULT> Callable<RESULT> interceptCallable(final Callable<RESULT> next) {
    final Callable<RESULT> c2 = new InitThreadLocalCallable<>(next, CURRENT_JMS_MESSAGE, m_jmsMessage);
    final Callable<RESULT> c1 = super.interceptCallable(c2);

    return c1;
  }

  @Override
  public JmsRunContext withRunMonitor(final RunMonitor runMonitor) {
    super.withRunMonitor(runMonitor);
    return this;
  }

  @Override
  public JmsRunContext withSubject(final Subject subject) {
    super.withSubject(subject);
    return this;
  }

  @Override
  public JmsRunContext withLocale(final Locale locale) {
    super.withLocale(locale);
    return this;
  }

  @Override
  public JmsRunContext withProperty(final Object key, final Object value) {
    super.withProperty(key, value);
    return this;
  }

  @Override
  public JmsRunContext withProperties(final Map<?, ?> properties) {
    super.withProperties(properties);
    return this;
  }

  public Message getJmsMessage() {
    return m_jmsMessage;
  }

  public JmsRunContext withJmsMessage(final Message jmsMessage) {
    m_jmsMessage = jmsMessage;
    return this;
  }

  @Override
  public String toString() {
    final ToStringBuilder builder = new ToStringBuilder(this);
    builder.attr("subject", getSubject());
    builder.attr("locale", getLocale());
    builder.ref("message", getJmsMessage());
    return builder.toString();
  }

  // === fill methods ===

  @Override
  protected void copyValues(final RunContext origin) {
    final JmsRunContext originRunContext = (JmsRunContext) origin;

    super.copyValues(originRunContext);
    m_jmsMessage = originRunContext.m_jmsMessage;
  }

  @Override
  protected void fillCurrentValues() {
    super.fillCurrentValues();
    m_jmsMessage = JmsRunContext.CURRENT_JMS_MESSAGE.get();
  }

  @Override
  protected void fillEmptyValues() {
    super.fillEmptyValues();
    m_jmsMessage = null;
  }

  @Override
  public JmsRunContext copy() {
    final JmsRunContext copy = BEANS.get(JmsRunContext.class);
    copy.copyValues(this);
    return copy;
  }
}
