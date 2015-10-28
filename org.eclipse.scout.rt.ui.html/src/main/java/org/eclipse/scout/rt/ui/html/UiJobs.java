package org.eclipse.scout.rt.ui.html;

import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.eclipse.scout.commons.Assertions;
import org.eclipse.scout.commons.IRunnable;
import org.eclipse.scout.rt.client.IClientSession;
import org.eclipse.scout.rt.client.context.ClientRunContext;
import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.client.job.ClientJobFutureFilters.Filter;
import org.eclipse.scout.rt.client.job.ModelJobs;
import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.context.RunContext;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.exception.ExceptionTranslator;
import org.eclipse.scout.rt.platform.exception.IThrowableTranslator;
import org.eclipse.scout.rt.platform.job.IFuture;
import org.eclipse.scout.rt.platform.job.JobInput;
import org.eclipse.scout.rt.platform.job.Jobs;

/**
 * Utility methods to work with the Job API from UI.
 */
@ApplicationScoped
public class UiJobs {

  protected static final long AWAIT_TIMEOUT = TimeUnit.HOURS.toMillis(1);
  protected static final String POLLING_REQUEST_HINT = "pollingRequest";

  /**
   * Blocks until all model jobs for the given session are done. Blocked jobs (e.g. waitFor) are ignored. If the calling
   * thread is already the model thread, an exception is thrown!
   *
   * @throws UiException
   *           in case the current thread was interrupted, or the waiting timeout elapsed, or the current thread is the
   *           model thread.
   */
  public void awaitAllModelJobs(final IClientSession clientSession) {
    Assertions.assertNotNull(clientSession, "Argument 'clientSession' must not be null");
    Assertions.assertFalse(ModelJobs.isModelThread(clientSession), "This method may not be called from the model thread");

    boolean timeout;
    try {
      Filter filter = ModelJobs.newFutureFilter().andMatchSession(clientSession).andAreNotBlocked();
      timeout = !Jobs.getJobManager().awaitDone(filter, AWAIT_TIMEOUT, TimeUnit.MILLISECONDS);
    }
    catch (RuntimeException e) {
      throw new UiException("Interrupted while waiting for model jobs to complete [clientSession=%s]", e, clientSession);
    }
    if (timeout) {
      throw new UiException("Timeout while waiting for model jobs to complete [timeout=%ss, clientSession=%s]", new TimeoutException(), TimeUnit.MILLISECONDS.toSeconds(AWAIT_TIMEOUT), clientSession);
    }
  }

  /**
   * Returns whether the given {@link RunContext} represents a polling request.
   */
  public boolean isPollingRequest(RunContext runContext) {
    Object pollingRequestHint = runContext.getProperty(POLLING_REQUEST_HINT);
    return pollingRequestHint instanceof Boolean && ((Boolean) pollingRequestHint).booleanValue();
  }

  /**
   * Runs the given job as model job, and blocks until the job completed (done or cancelled), or enters a blocking
   * condition. Any exception thrown is translated by the given {@link IThrowableTranslator} and propagated to the
   * caller.
   *
   * @param callable
   *          {@link Callable} to be run.
   * @param jobInput
   *          input to run the model job.
   * @param throwableTranslatorClass
   *          translator to be used to translate any thrown exception.
   * @return the job's result.
   */
  public <RESULT, ERROR extends Throwable> RESULT runAsModelJob(final Callable<RESULT> callable, final JobInput jobInput, final Class<? extends IThrowableTranslator<ERROR>> throwableTranslatorClass) throws ERROR {
    Assertions.assertTrue(!ModelJobs.isModelThread(), "must not be invoked in model thread");

    final IFuture<RESULT> future = ModelJobs.schedule(callable, jobInput.copy().withLogOnError(false));

    // Wait until the job is done (completed or cancelled), or enters a blocking condition.
    boolean timeout;
    try {
      timeout = !Jobs.getJobManager().awaitDone(Jobs.newFutureFilter().andMatchAnyFuture(future).andAreNotBlocked(), AWAIT_TIMEOUT, TimeUnit.MILLISECONDS);
    }
    catch (RuntimeException e) {
      // FIXME [dwi] use translator to not work with ProcessingException
      throw new UiException("Interrupted while waiting for a job to complete. [job=%s, future=%s]", e, callable.getClass().getName(), future);
    }

    if (timeout) {
      throw new UiException("Timeout elapsed while waiting for a job to complete [job=%s, timeout=%ss, future=%s]", new TimeoutException(), callable.getClass().getName(), TimeUnit.MILLISECONDS.toSeconds(AWAIT_TIMEOUT), future);
    }

    // Return immediately if the job is not done yet, e.g. because waiting for a blocking condition to fall.
    if (!future.isDone()) {
      return null;
    }

    // Return the future's result or processing exception.
    return future.awaitDoneAndGet(BEANS.get(throwableTranslatorClass));
  }

  /**
   * Calls {@link #runAsModelJob(Callable, JobInput, Class)} but uses an {@link ExceptionHandler} to handle any thrown
   * exception.
   * <p>
   * Important: This method may only be used if a model messagebox may be displayed because the exception handler uses
   * waitFor to wait for a button click and therefore blocks the thread. If the messagebox cannot be displayed (e.g. on
   * session startup) nobody will release the waitFor lock.
   */
  public <RESULT> RESULT runAsModelJobAndHandleException(final Callable<RESULT> callable, final JobInput jobInput) {
    try {
      return runAsModelJob(callable, jobInput, ExceptionTranslator.class);
    }
    catch (final Exception e) {
      ModelJobs.schedule(new IRunnable() {

        @Override
        public void run() throws Exception {
          BEANS.get(ExceptionHandler.class).handle(e);
        }
      }, jobInput.withName("Handling exception"));
      return null;
    }
  }

  /**
   * Creates the {@link JobInput} to be used to run model jobs.
   *
   * @param jobName
   *          name to use for the model job (expect if the current thread is already the model job)
   * @param clientSession
   *          client session to run the job on behalf
   * @param pollingRequest
   *          whether the model job is started for a "polling request". Set this argument to <code>false</code> when
   *          handling a user context. A flag is put in the job input property map and may be retrieved again using the
   *          method {@link #isPollingRequestJob(JobInput)}. This flag is useful when listening for certain job manager
   *          events (see {@link UiSession#UiSession()}.
   */
  public JobInput newModelJobInput(final String jobName, final IClientSession clientSession, final boolean pollingRequest) {
    ClientRunContext runContext = ClientRunContexts.copyCurrent()
        .withSession(clientSession, true)
        .withProperty(POLLING_REQUEST_HINT, pollingRequest);
    return ModelJobs.newInput(runContext).withName(jobName);
  }
}
