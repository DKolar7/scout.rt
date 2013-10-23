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
package org.eclipse.scout.rt.ui.rap.ext;

import org.eclipse.swt.SWT;
import org.eclipse.swt.events.MouseEvent;
import org.eclipse.swt.events.MouseListener;
import org.eclipse.swt.widgets.Composite;

/**
 * A CheckBox whose label supports multiline. See {@link MultilineButton} for more information
 * 
 * @since 3.10.0-M4
 */
public class MultilineCheckbox extends MultilineButton {
  private static final long serialVersionUID = 1L;

  public MultilineCheckbox(Composite parent, int style) {
    super(parent, style | SWT.CHECK);

    label.addMouseListener(new P_LabelMouseListener());
  }

  /**
   * Install a mouse listener on the label. Otherwise, the CheckBox would only react on mouse clicks on the button.
   */
  private class P_LabelMouseListener implements MouseListener {
    private static final long serialVersionUID = 1L;

    @Override
    public void mouseDoubleClick(MouseEvent e) {
    }

    @Override
    public void mouseDown(MouseEvent e) {
    }

    @Override
    public void mouseUp(MouseEvent e) {
      if (leftMouseButtonClicked(e)) {
        btn.setSelection(!btn.getSelection());
      }
    }

    private boolean leftMouseButtonClicked(MouseEvent e) {
      if (e.button == 1) {
        return true;
      }
      return false;
    }
  }
}
