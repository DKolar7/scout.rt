package org.eclipse.scout.rt.client.ui.form.fields.smartfield;

import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.platform.annotations.Internal;
import org.eclipse.scout.rt.platform.job.DoneEvent;
import org.eclipse.scout.rt.platform.job.IBlockingCondition;
import org.eclipse.scout.rt.platform.job.IDoneHandler;
import org.eclipse.scout.rt.platform.job.IFuture;
import org.eclipse.scout.rt.platform.job.Jobs;

/**
 * Job helper methods to be included later in the job framework.
 */
@Internal
public class LookupJobHelper {

  /**
   * await result while freeing model thread
   */
  public static <T> T await(IFuture<T> futureRes) {
    final IBlockingCondition bc = Jobs.newBlockingCondition(true);
    futureRes.whenDone(new IDoneHandler<T>() {

      @Override
      public void onDone(DoneEvent<T> event) {
        bc.setBlocking(false);
      }
    }, ClientRunContexts.copyCurrent());
    bc.waitFor();

    return futureRes.awaitDoneAndGet();
  }

  /**
   * await result while freeing model thread
   */
  public static <T> void awaitDone(IFuture<T> futureRes) {
    final IBlockingCondition bc = Jobs.newBlockingCondition(true);
    futureRes.whenDone(new IDoneHandler<T>() {

      @Override
      public void onDone(DoneEvent<T> event) {
        bc.setBlocking(false);
      }
    }, ClientRunContexts.copyCurrent());
    bc.waitFor();
    futureRes.awaitDone();
  }

}
