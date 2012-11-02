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
package org.eclipse.scout.rt.client.ui.desktop.bookmark;

import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.desktop.bookmark.BookmarkFolderForm.MainBox.GroupBox.NameField;
import org.eclipse.scout.rt.client.ui.form.AbstractForm;
import org.eclipse.scout.rt.client.ui.form.AbstractFormHandler;
import org.eclipse.scout.rt.client.ui.form.fields.button.AbstractCancelButton;
import org.eclipse.scout.rt.client.ui.form.fields.button.AbstractOkButton;
import org.eclipse.scout.rt.client.ui.form.fields.groupbox.AbstractGroupBox;
import org.eclipse.scout.rt.client.ui.form.fields.stringfield.AbstractStringField;
import org.eclipse.scout.rt.shared.ScoutTexts;

public class BookmarkFolderForm extends AbstractForm {

  public BookmarkFolderForm() throws ProcessingException {
    super();
  }

  @Override
  protected String getConfiguredTitle() {
    return ScoutTexts.get("Folders");
  }

  public void startNew() throws ProcessingException {
    startInternal(new NewHandler());
  }

  public void startModify() throws ProcessingException {
    startInternal(new ModifyHandler());
  }

  public MainBox getMainBox() {
    return (MainBox) getRootGroupBox();
  }

  public NameField getNameField() {
    return getFieldByClass(NameField.class);
  }

  @Order(10f)
  public class MainBox extends AbstractGroupBox {

    @Override
    protected int getConfiguredGridColumnCount() {
      return 1;
    }

    @Order(10f)
    public class GroupBox extends AbstractGroupBox {

      @Order(10f)
      public class NameField extends AbstractStringField {
        @Override
        protected String getConfiguredLabel() {
          return ScoutTexts.get("Name");
        }

        @Override
        protected boolean getConfiguredMandatory() {
          return true;
        }

        @Override
        protected int getConfiguredMaxLength() {
          return 4000;
        }

        @Override
        protected String execValidateValue(String rawValue) throws ProcessingException {
          return rawValue.replaceAll("[\\/]", " ").trim();
        }
      }
    }

    @Order(40f)
    public class OkButton extends AbstractOkButton {
    }

    @Order(50f)
    public class CancelButton extends AbstractCancelButton {
    }
  }

  @Order(20f)
  public class NewHandler extends AbstractFormHandler {
  }

  @Order(20f)
  public class ModifyHandler extends AbstractFormHandler {
  }
}
