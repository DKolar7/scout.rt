/*
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.shared.session;

import java.math.BigInteger;

import org.eclipse.scout.rt.platform.security.SecurityUtility;
import org.eclipse.scout.rt.platform.util.TypeCastUtility;
import org.eclipse.scout.rt.shared.ISession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Helper class to work with sessions.
 *
 * @since 5.2
 */
public final class Sessions {

  private static final Logger LOG = LoggerFactory.getLogger(Sessions.class);

  private Sessions() {
  }

  /**
   * Returns the session associated with the current thread, or <code>null</code> if not set, or if not of the expected
   * type.
   */
  public static <SESSION extends ISession> SESSION currentSession(final Class<SESSION> type) {
    final ISession session = ISession.CURRENT.get();
    if (session == null) {
      return null;
    }

    try {
      return TypeCastUtility.castValue(session, type);
    }
    catch (final IllegalArgumentException e) {
      LOG.debug("Session not of the expected type [session={}, expectedType={}]", session, type, e);
      return null;
    }
  }

  /**
   * Returns a random session ID to be used when creating a session.
   */
  public static String randomSessionId() {
    // see https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Session_Management_Cheat_Sheet.md
    BigInteger randomId = new BigInteger(1, SecurityUtility.createRandomBytes());

    // use Base32 encoding because it is shorter than hex and does not include special characters and is case-insensitive (compared to Base64).
    return randomId.toString(32);
  }
}
