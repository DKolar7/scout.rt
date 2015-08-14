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
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.services.lookup.DefaultLookupCallProvisioningService;
import org.eclipse.scout.rt.client.services.lookup.ILookupCallProvisioningService;
import org.eclipse.scout.rt.client.testenvironment.TestEnvironmentClientSession;
import org.eclipse.scout.rt.client.ui.basic.cell.ICell;
import org.eclipse.scout.rt.client.ui.basic.table.AbstractTable;
import org.eclipse.scout.rt.client.ui.basic.table.ITableRow;
import org.eclipse.scout.rt.client.ui.basic.table.columns.fixture.TestCodeType;
import org.eclipse.scout.rt.client.ui.form.fields.IValueField;
import org.eclipse.scout.rt.client.ui.form.fields.smartfield.AbstractMixedSmartField;
import org.eclipse.scout.rt.client.ui.form.fields.smartfield.IMixedSmartField;
import org.eclipse.scout.rt.platform.BeanMetaData;
import org.eclipse.scout.rt.platform.IBean;
import org.eclipse.scout.rt.shared.services.common.code.ICodeService;
import org.eclipse.scout.rt.shared.services.common.code.ICodeType;
import org.eclipse.scout.rt.shared.services.lookup.DefaultCodeLookupCallFactoryService;
import org.eclipse.scout.rt.shared.services.lookup.ICodeLookupCallFactoryService;
import org.eclipse.scout.rt.shared.services.lookup.ILookupCall;
import org.eclipse.scout.rt.testing.client.runner.ClientTestRunner;
import org.eclipse.scout.rt.testing.client.runner.RunWithClientSession;
import org.eclipse.scout.rt.testing.platform.runner.RunWithSubject;
import org.eclipse.scout.rt.testing.shared.TestingUtility;
import org.eclipse.scout.rt.testing.shared.services.common.code.TestingCodeService;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;

/**
 * Tests for {@link AbstractMixedSmartColumn}
 */
@RunWith(ClientTestRunner.class)
@RunWithSubject("default")
@RunWithClientSession(TestEnvironmentClientSession.class)
public class AbstractMixedSmartColumnTest {

  private static List<IBean<?>> s_regs;

  @BeforeClass
  public static void beforeClass() throws Exception {
    TestingCodeService codeService = new TestingCodeService(new TestCodeType());
    DefaultCodeLookupCallFactoryService codeLookupCallFactoryService = new DefaultCodeLookupCallFactoryService();
    s_regs = TestingUtility.registerBeans(
        new BeanMetaData(ICodeService.class).
            withInitialInstance(codeService).
            withApplicationScoped(true),
        new BeanMetaData(ICodeLookupCallFactoryService.class).
            withInitialInstance(codeLookupCallFactoryService).
            withApplicationScoped(true),
        new BeanMetaData(ILookupCallProvisioningService.class).
            withInitialInstance(new DefaultLookupCallProvisioningService()).
            withApplicationScoped(true)
        );

  }

  @AfterClass
  public static void afterClass() throws Exception {
    TestingUtility.unregisterBeans(s_regs);
  }

  @Test
  public void testPrepareEditInternal() throws ProcessingException {
    AbstractMixedSmartColumn<Long, Long> column = new AbstractMixedSmartColumn<Long, Long>() {
    };
    column.setCodeTypeClass(TestCodeType.class);
    column.setMandatory(true);
    ITableRow row = mock(ITableRow.class);
    @SuppressWarnings("unchecked")
    IMixedSmartField<Long, Long> field = (IMixedSmartField<Long, Long>) column.prepareEditInternal(row);
    assertEquals("mandatory property to be progagated to field", column.isMandatory(), field.isMandatory());
    assertEquals("code type class property to be progagated to field", column.getCodeTypeClass(), field.getCodeTypeClass());
    assertEquals("browse new text to be progagated to field", column.getConfiguredBrowseNewText(), field.getBrowseNewText());
  }

  /**
   * Tests successful editing of a table cell
   */
  @Test
  public void testEditingValidValue() throws ProcessingException {
    P_Table table = new P_Table();
    table.addRowsByArray(new Object[]{1L});
    ITableRow testRow = table.getRow(0);
    @SuppressWarnings("unchecked")
    IMixedSmartField<Long, Long> field = (IMixedSmartField<Long, Long>) table.getEditableSmartColumn().prepareEdit(testRow);
    field.parseAndSetValue(TestCodeType.TestCode.TEXT);
    table.getEditableSmartColumn().completeEdit(testRow, field);
    assertNull(field.getErrorStatus());
    assertTrue(testRow.getCellForUpdate(table.getEditableSmartColumn()).isContentValid());
  }

  /**
   * An unparsable error should lead to an error on the column
   */
  @Test
  public void testSetUnparsableValue() throws ProcessingException {
    P_Table table = new P_Table();
    table.addRowsByArray(new Object[]{1L});
    ITableRow testRow = table.getRow(0);
    @SuppressWarnings("unchecked")
    IMixedSmartField<Long, Long> field = (IMixedSmartField<Long, Long>) table.getEditableSmartColumn().prepareEdit(testRow);
    field.parseAndSetValue("-1L");
    table.getEditableSmartColumn().completeEdit(testRow, field);
    assertNotNull(field.getErrorStatus());
    assertFalse(testRow.getCellForUpdate(table.getEditableSmartColumn()).isContentValid());
  }

  /**
   * An unparsable error should be reset, if a valid value is entered
   */
  @Test
  public void testResetParsingError() throws ProcessingException {
    P_Table table = new P_Table();
    table.addRowsByArray(new Object[]{1L});
    ITableRow testRow = table.getRow(0);
    @SuppressWarnings("unchecked")
    IMixedSmartField<Long, Long> field = (IMixedSmartField<Long, Long>) table.getEditableSmartColumn().prepareEdit(testRow);
    field.parseAndSetValue("-1L");
    table.getEditableSmartColumn().completeEdit(testRow, field);
    field.parseAndSetValue(TestCodeType.TestCode.TEXT);
    table.getEditableSmartColumn().completeEdit(testRow, field);
    assertNull(field.getErrorStatus());
    assertTrue(testRow.getCellForUpdate(table.getEditableSmartColumn()).isContentValid());
  }

  /**
   * Tests that {@link AbstractMixedSmartColumn#execPrepareLookup(ILookupCall, ITableRow)} is called when
   * {@link IMixedSmartField#prepareKeyLookup(ILookupCall, Object)} is called on the editor field.
   */
  @SuppressWarnings("unchecked")
  @Test
  public void testPrepareLookupCallback() throws ProcessingException {
    TestMixedSmartColumn column = new TestMixedSmartColumn();
    ITableRow row = Mockito.mock(ITableRow.class);
    IMixedSmartField<String, Long> field = (IMixedSmartField<String, Long>) column.prepareEditInternal(row);
    ILookupCall call = mock(ILookupCall.class);
    field.prepareKeyLookup(call, 10L);
    assertEquals(row, column.lastRow);
    assertEquals(call, column.lastCall);
  }

  /**
   * Tests that {@link AbstractMixedSmartColumn#execPrepareLookup(ILookupCall, ITableRow)} is called when
   * {@link IMixedSmartField#prepareKeyLookup(ILookupCall, Object)} is called on the editor field.
   */
  @SuppressWarnings("unchecked")
  @Test
  public void tesConvertValueToKeyCallback() throws ProcessingException {
    TestMixedSmartColumn column = new TestMixedSmartColumn();
    ITableRow row = Mockito.mock(ITableRow.class);
    AbstractMixedSmartField<String, Long> field = (AbstractMixedSmartField<String, Long>) column.prepareEditInternal(row);
    field.setValue("test");
    Long lookupKey = field.getValueAsLookupKey();
    assertEquals(Long.valueOf(0L), lookupKey);
    assertEquals(column.lastValue, "test");
  }

  @Test
  public void testCompleteEdit_ParsingError() throws Exception {
    P_Table table = new P_Table();
    table.addRowsByArray(new Long[]{3L});

    IValueField<?> field = (IValueField<?>) table.getEditableSmartColumn().prepareEdit(table.getRow(0));
    field.parseAndSetValue("invalid Text");
    table.getEditableSmartColumn().completeEdit(table.getRow(0), field);
    ICell c = table.getCell(0, 0);
    assertEquals("invalid Text", c.getText());
    assertNotNull(String.format("The invalid cell should have an error status: value '%s'", c.getValue(), c.getErrorStatus()));
  }

  class TestMixedSmartColumn extends AbstractMixedSmartColumn<String, Long> {
    ILookupCall<Long> lastCall;
    ITableRow lastRow;
    String lastValue;

    @Override
    protected void execPrepareLookup(ILookupCall<Long> call, ITableRow row) {
      lastCall = call;
      lastRow = row;
    }

    @Override
    protected Long execConvertValueToKey(String value) {
      lastValue = value;
      return 0L;
    }
  }

  public static class P_Table extends AbstractTable {

    public EditableSmartColumn getEditableSmartColumn() {
      return getColumnSet().getColumnByClass(EditableSmartColumn.class);
    }

    public static class EditableSmartColumn extends AbstractMixedSmartColumn<String, Long> {

      @Override
      protected boolean getConfiguredEditable() {
        return true;
      }

      @Override
      protected Class<? extends ICodeType<?, Long>> getConfiguredCodeType() {
        return TestCodeType.class;
      }
    }

  }

}
