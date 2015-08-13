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
package org.eclipse.scout.rt.server.scheduler;

import static org.junit.Assert.assertEquals;

import java.util.Calendar;

import javax.security.auth.Subject;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.commons.security.SimplePrincipal;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.server.TestServerSession;
import org.eclipse.scout.rt.server.context.ServerRunContext;
import org.eclipse.scout.rt.server.context.ServerRunContexts;
import org.eclipse.scout.rt.server.session.ServerSessionProvider;
import org.eclipse.scout.rt.testing.platform.runner.RunWithSubject;
import org.eclipse.scout.rt.testing.server.runner.RunWithServerSession;
import org.eclipse.scout.rt.testing.server.runner.ServerTestRunner;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Tests for IScheduler
 */
@RunWith(ServerTestRunner.class)
@RunWithServerSession(TestServerSession.class)
@RunWithSubject("john")
public class SchedulerTest {

  private ServerRunContext m_runContext;
  private Ticker m_ticker;

  @Before
  public void before() throws ProcessingException {
    Subject subject = new Subject();
    subject.getPrincipals().add(new SimplePrincipal("john"));
    subject.setReadOnly();

    m_runContext = ServerRunContexts.empty();
    m_runContext.withSubject(subject);
    m_runContext.withSession(BEANS.get(ServerSessionProvider.class).provide(m_runContext.copy()));

    m_ticker = new Ticker(Calendar.SECOND);

  }

  @Test
  public void testRunningJobCount() throws ProcessingException, InterruptedException {
    IScheduler scheduler = new Scheduler(m_ticker, m_runContext);
    scheduler.addJob(new JobAcceptTick("groupId", "jobIdAccept"));
    scheduler.addJob(new JobDontAcceptTick("groupId", "jobIdDontAccept"));
    assertEquals("JobCount must be 2", 2, scheduler.getJobCount());
    scheduler.start();

    Thread.sleep(150); //now, JobAcceptTick should be running
    assertEquals("JobAcceptTick should be running only", 1, scheduler.getRunningJobCount());
    assertEquals("JobAcceptTick should be running only", 1, scheduler.getRunningJobs(null, null).size());
    assertEquals("2 Jobs should be in the Scheduler", 2, scheduler.getAllJobs().size());
    assertEquals("2 Jobs should be in the Scheduler", 2, scheduler.getJobCount());

    Thread.sleep(100); //now JobAcceptTick should be finished
    assertEquals("No running job left", 0, scheduler.getRunningJobCount());
    assertEquals("No running job left", 0, scheduler.getRunningJobs(null, null).size());
    assertEquals("jobDontAccept should be in the Scheduler", 1, scheduler.getAllJobs().size());
    assertEquals("jobDontAccept should be in the Scheduler", 1, scheduler.getJobCount());
  }
}

class JobAcceptTick extends AbstractSchedulerJob {
  private static IScoutLogger LOG = ScoutLogManager.getLogger(JobAcceptTick.class);

  public JobAcceptTick(String groupId, String jobId) {
    super(groupId, jobId);
  }

  @Override
  public void run(IScheduler scheduler, TickSignal signal) throws ProcessingException {
    try {
      Thread.sleep(200);
    }
    catch (InterruptedException e) {
      LOG.error("Interrupted tick", e);
    }
    setDisposed(true);
  }

  @Override
  public boolean acceptTick(TickSignal signal) {
    return true;
  }
}

class JobDontAcceptTick extends AbstractSchedulerJob {
  public JobDontAcceptTick(String groupId, String jobId) {
    super(groupId, jobId);
  }

  @Override
  public boolean acceptTick(TickSignal signal) {
    return false;
  }
}
