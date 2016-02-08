package org.eclipse.scout.jaxws.apt.internal.util;

/**
 * Similar to {@link org.eclipse.scout.rt.platform.util.Assertions}, but with no usage of SLF4J Message formatter.
 *
 * @TODO [6.1] dwi: Remove this class when building with Maven newer than 3.3.3. In older Maven versions, there is a
 *       bug, that SLF4J classes are not found. See https://issues.apache.org/jira/browse/MNG-5842.
 */
public final class Assertions {

  private Assertions() {
  }

  /**
   * @see org.eclipse.scout.rt.platform.util.Assertions#assertNotNullOrEmpty(String, String, Object...)
   */
  public static <T> T assertNotNull(final T value, final String msg, final Object... msgArgs) {
    if (value == null) {
      fail(msg, msgArgs);
    }
    return value;
  }

  /**
   * @see org.eclipse.scout.rt.platform.util.Assertions#fail(String, Object...)
   */
  public static <T> T fail(final String msg, final Object... msgArgs) {
    throw new IllegalArgumentException(SLF4JMessageFormatter.format(msg, msgArgs).getMessage());
  }
}
