/*
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.platform.util;

import java.util.Map;

/**
 * A simple pair class, having two mutable properties <code>left</code> and <code>right</code> with different generic
 * types.
 * <p>
 * <b>Do not use this class as key for {@link Map} or in a cache, since the members are mutable. Use
 * {@link ImmutablePair} instead.</b>
 *
 * @since 6.1
 */
@SuppressWarnings("squid:S2160")
public class MutablePair<L, R> extends Pair<L, R> {

  private static final long serialVersionUID = 1L;

  private L m_left;
  private R m_right;

  public MutablePair(L left, R right) {
    m_left = left;
    m_right = right;
  }

  @Override
  public L getLeft() {
    return m_left;
  }

  public void setLeft(L left) {
    m_left = left;
  }

  @Override
  public R getRight() {
    return m_right;
  }

  public void setRight(R right) {
    m_right = right;
  }

  /**
   * @return {@link MutablePair} instance with given values
   */
  public static <L, R> MutablePair<L, R> of(L left, R right) {
    return new MutablePair<>(left, right);
  }
}
