package org.eclipse.scout.rt.client.job.filter.event;

import org.eclipse.scout.commons.IAdaptable;
import org.eclipse.scout.commons.filter.IFilter;
import org.eclipse.scout.rt.client.IClientSession;
import org.eclipse.scout.rt.client.context.ClientRunContext;
import org.eclipse.scout.rt.client.job.filter.future.ModelJobFutureFilter;
import org.eclipse.scout.rt.platform.job.filter.event.FutureFilterWrapperJobEventFilter;
import org.eclipse.scout.rt.platform.job.listener.JobEvent;

/**
 * Filter to accept all events for model jobs. Those are jobs, which are running on behalf of a {@link ClientRunContext}
 * , and have the {@link IClientSession} set as their mutex object.
 * <p>
 * However, only one such model job Future is active at any time, and its executing thread is called the model thread.
 *
 * @since 5.2
 */
public class ModelJobEventFilter implements IFilter<JobEvent>, IAdaptable {

  public static final IFilter<JobEvent> INSTANCE = new ModelJobEventFilter();

  private final FutureFilterWrapperJobEventFilter m_futureFilterDelegate;

  private ModelJobEventFilter() {
    m_futureFilterDelegate = new FutureFilterWrapperJobEventFilter(ModelJobFutureFilter.INSTANCE);
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
