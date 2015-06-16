/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.basic.table.columns;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.exception.VetoException;
import org.eclipse.scout.rt.client.ui.basic.table.AbstractTable;
import org.eclipse.scout.rt.client.ui.basic.table.ITableRow;
import org.eclipse.scout.rt.client.ui.basic.table.columns.AbstractStringColumnTest.TestTable.TestStringColumn;
import org.eclipse.scout.rt.client.ui.form.fields.stringfield.IStringField;
import org.junit.Test;
import org.mockito.Mockito;

/**
 * Tests for {@link AbstractStringColumn}
 */
public class AbstractStringColumnTest {

  @Test
  public void testPrepareEditInternal() throws ProcessingException {
    AbstractStringColumn column = new AbstractStringColumn() {
    };
    column.setCssClass("myCSSClass");
    column.setInputMasked(true);
    column.setMandatory(true);
    ITableRow row = Mockito.mock(ITableRow.class);
    IStringField field = (IStringField) column.prepareEditInternal(row);
    assertEquals("input masked property to be progagated to field", column.isInputMasked(), field.isInputMasked());
    assertEquals("mandatory property to be progagated to field", column.isMandatory(), field.isMandatory());
    //TODO jgu
//    assertEquals("css class property to be progagated to field", column.getCssClass(), field.getCssClass());
  }

  @Test
  public void testCustomValidation() throws ProcessingException {
    TestTable table = new TestTable();
    TestStringColumn col = table.getTestStringColumn();
    ITableRow row = table.addRowByArray(new Object[]{"valid"});
    IStringField editor = (IStringField) col.prepareEdit(row);
    editor.setValue("invalid");
    col.completeEdit(row, editor);
    assertFalse(table.getCell(0, 0).isContentValid());
  }

  public class TestTable extends AbstractTable {

    public TestStringColumn getTestStringColumn() {
      return getColumnSet().getColumnByClass(TestStringColumn.class);
    }

    @Order(70.0)
    public class TestStringColumn extends AbstractStringColumn {

      @Override
      protected boolean getConfiguredEditable() {
        return true;
      }

      @Override
      protected String execValidateValue(ITableRow row, String rawValue) throws ProcessingException {
        if ("invalid".equals(rawValue)) {
          throw new VetoException("invalid");
        }
        return super.execValidateValue(row, rawValue);
      }
    }

  }

}
