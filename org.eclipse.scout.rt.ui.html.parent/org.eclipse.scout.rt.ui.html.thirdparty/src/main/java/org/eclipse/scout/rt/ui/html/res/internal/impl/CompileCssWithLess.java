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
package org.eclipse.scout.rt.ui.html.res.internal.impl;

import java.io.IOException;

import com.asual.lesscss.LessEngine;
import com.asual.lesscss.LessException;

public class CompileCssWithLess {

  public String run(String content) throws IOException {
    LessEngine engine = new LessEngine();
    try {
      return engine.compile(content);
    }
    catch (LessException e) {
      throw new IOException("Failed to parse CSS content with LESS", e);
    }
  }

}
