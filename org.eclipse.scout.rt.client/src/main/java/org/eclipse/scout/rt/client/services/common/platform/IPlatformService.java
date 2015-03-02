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
package org.eclipse.scout.rt.client.services.common.platform;

import org.eclipse.scout.service.IService;

//TODO imo remove together with ISession.getBundle
public interface IPlatformService extends IService {

  String getFile();

  String getFile(String ext, boolean open);

  String getFile(String ext, boolean open, String curPath);

  String getFile(String ext, boolean openMode, String curPath, boolean folderMode);
}
