package org.eclipse.scout.rt.shared.job.filter.event;

import org.eclipse.scout.commons.IAdaptable;
import org.eclipse.scout.commons.filter.IFilter;
import org.eclipse.scout.rt.platform.job.filter.event.FutureFilterWrapperJobEventFilter;
import org.eclipse.scout.rt.platform.job.listener.JobEvent;
import org.eclipse.scout.rt.shared.ISession;
import org.eclipse.scout.rt.shared.job.filter.future.SessionFutureFilter;

/**
 * Filter to accept all events for jobs which have a specific {@link ISession} set in their running context.
 *
 * @since 5.2
 */
public class SessionJobEventFilter implements IFilter<JobEvent>, IAdaptable {

  private final FutureFilterWrapperJobEventFilter m_futureFilterDelegate;

  public SessionJobEventFilter(final ISession session) {
    m_futureFilterDelegate = new FutureFilterWrapperJobEventFilter(new SessionFutureFilter(session));
  }

  @Override
  public boolean accept(final JobEvent event) {
    return m_futureFilterDelegate.accept(event);
  }

  @Override
  public <T> T getAdapter(final Class<T> type) {
    return m_futureFilterDelegate.getAdapter(type);
  }
}
