/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.server.scheduler.internal;

import org.eclipse.scout.rt.server.scheduler.ISchedulingFormula;
import org.eclipse.scout.rt.server.scheduler.TickSignal;
import org.eclipse.scout.rt.server.scheduler.internal.node.FormulaRoot;
import org.eclipse.scout.rt.server.scheduler.internal.visitor.DefaultEvalVisitor;
import org.eclipse.scout.rt.server.scheduler.internal.visitor.DefaultFormatVisitor;

public class SchedulingFormula implements ISchedulingFormula {
  private FormulaRoot m_root;

  public SchedulingFormula(FormulaRoot root) {
    m_root = root;
  }

  @Override
  public boolean eval(TickSignal signal, Object[] args) {
    DefaultEvalVisitor v = new DefaultEvalVisitor(signal, args);
    return v.toBoolean(m_root.eval(v));
  }

  @Override
  public String toString() {
    DefaultFormatVisitor v = new DefaultFormatVisitor();
    m_root.format(v);
    return v.getText();
  }
}
