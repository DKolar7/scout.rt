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
package org.eclipse.scout.rt.ui.html.services.common.clipboard;

import java.io.UnsupportedEncodingException;
import java.util.Collection;
import java.util.Collections;

import org.eclipse.scout.commons.Encoding;
import org.eclipse.scout.commons.dnd.TextTransferObject;
import org.eclipse.scout.commons.dnd.TransferObject;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.resource.BinaryResource;
import org.eclipse.scout.commons.resource.MimeType;
import org.eclipse.scout.rt.client.Client;
import org.eclipse.scout.rt.client.services.common.clipboard.IClipboardService;
import org.eclipse.scout.rt.client.ui.form.clipboard.ClipboardForm;
import org.eclipse.scout.rt.platform.service.AbstractService;

@Client
public class HtmlScoutClipboardService extends AbstractService implements IClipboardService {

  @Override
  public Collection<BinaryResource> getClipboardContents(MimeType... mimeTypes) throws ProcessingException {
    ClipboardForm form = new ClipboardForm();
    form.setMimeTypes(mimeTypes);
    form.startPaste();
    form.waitFor();
    if (form.isFormStored()) {
      return form.getClipboardField().getValue();
    }
    return Collections.emptyList();
  }

  @Override
  public void setContents(final TransferObject transferObject) throws ProcessingException {
    if (transferObject instanceof TextTransferObject) {
      setTextContents(((TextTransferObject) transferObject).getPlainText());
      return;
    }
    throw new ProcessingException("Not implemented");
  }

  @Override
  public void setTextContents(String textContents) throws ProcessingException {
    ClipboardForm form = new ClipboardForm();
    form.setMimeTypes(MimeType.TEXT_PLAIN);
    BinaryResource binaryResource;
    try {
      binaryResource = new BinaryResource(MimeType.TEXT_PLAIN, textContents.getBytes(Encoding.UTF_8));
    }
    catch (UnsupportedEncodingException e) {
      throw new ProcessingException("Unsupported encoding", e);
    }
    form.getClipboardField().setValue(Collections.singleton(binaryResource));
    form.startCopy();
  }
}
