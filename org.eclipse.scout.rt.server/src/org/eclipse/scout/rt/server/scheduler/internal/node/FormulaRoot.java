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
package org.eclipse.scout.rt.server.scheduler.internal.node;

import org.eclipse.scout.rt.server.scheduler.internal.visitor.IEvalVisitor;
import org.eclipse.scout.rt.server.scheduler.internal.visitor.IFormatVisitor;

public class FormulaRoot extends AbstractNode {
  private INode m_node;

  public FormulaRoot(INode node) {
    m_node = node;
  }

  public void format(IFormatVisitor v) {
    v.start();
    m_node.format(v);
    v.end();
  }

  public Object eval(IEvalVisitor v) {
    return m_node.eval(v);
  }

}
