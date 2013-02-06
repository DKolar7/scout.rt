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

public class WrappedToken extends AbstractNode implements INode {
  private INode m_node;

  public WrappedToken(INode node) {
    m_node = node;
  }

  public INode getNode() {
    return m_node;
  }

  @Override
  public void format(IFormatVisitor v) {
    v.print("(");
    m_node.format(v);
    v.print(")");
  }

  @Override
  public Object eval(IEvalVisitor v) {
    return m_node.eval(v);
  }

}
