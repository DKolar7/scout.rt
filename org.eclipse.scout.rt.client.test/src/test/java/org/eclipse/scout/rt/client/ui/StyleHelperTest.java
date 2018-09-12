/*******************************************************************************
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui;

import org.eclipse.scout.rt.client.ui.basic.cell.Cell;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.testing.platform.runner.PlatformTestRunner;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Junit test for {@link StyleHelper}
 *
 * @since 5.2
 */
@RunWith(PlatformTestRunner.class)
public class StyleHelperTest {

  public static final String CLASS = "class";
  public static final String INITIAL_FIRST_CLASS = "first-class";
  public static final String INITIAL_LAST_CLASS = "last-class";
  public static final String INITIAL_CLASSES = INITIAL_FIRST_CLASS + " " + CLASS + " " + INITIAL_LAST_CLASS;
  public static final String ADDED_CLASS = "added-class";

  @Test
  public void testAddCssClassNull() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, null);
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testAddCssClassEmpty() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, "");
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testAddCssClass() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, ADDED_CLASS);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, newClasses);
  }

  @Test
  public void testAddCssClassAlreadyContainedAsFirst() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, INITIAL_FIRST_CLASS);
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testAddCssClassAlreadyContainedAsLast() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, INITIAL_LAST_CLASS);
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testAddCssClassAlreadyContained() {
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(INITIAL_CLASSES, CLASS);
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testAddCssClassToNullCssClasses() {
    String nullClasses = null;
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(nullClasses, ADDED_CLASS);
    Assert.assertEquals(ADDED_CLASS, newClasses);
  }

  @Test
  public void testAddCssClassToEmptyCssClasses() {
    String emptyClasses = "";
    String newClasses = BEANS.get(StyleHelper.class).addCssClass(emptyClasses, ADDED_CLASS);
    Assert.assertEquals(ADDED_CLASS, newClasses);
  }

  @Test
  public void testAddCssClassStylable() {
    IStyleable stylable = new Cell();
    stylable.setCssClass(INITIAL_CLASSES);
    BEANS.get(StyleHelper.class).addCssClass(stylable, ADDED_CLASS);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, stylable.getCssClass());
  }

  @Test
  public void testRemoveCssClassFirst() {
    String newClasses = BEANS.get(StyleHelper.class).removeCssClass(INITIAL_CLASSES, INITIAL_FIRST_CLASS);
    Assert.assertEquals("class " + INITIAL_LAST_CLASS, newClasses);
  }

  @Test
  public void testRemoveCssClassLast() {
    String newClasses = BEANS.get(StyleHelper.class).removeCssClass(INITIAL_CLASSES, INITIAL_LAST_CLASS);
    Assert.assertEquals(INITIAL_FIRST_CLASS + " " + CLASS, newClasses);
  }

  @Test
  public void testRemoveCssClass() {
    String newClasses = BEANS.get(StyleHelper.class).removeCssClass(INITIAL_CLASSES, CLASS);
    Assert.assertEquals(INITIAL_FIRST_CLASS + " " + INITIAL_LAST_CLASS, newClasses);
  }

  @Test
  public void testRemoveCssClassStylable() {
    IStyleable stylable = new Cell();
    stylable.setCssClass(INITIAL_CLASSES);
    BEANS.get(StyleHelper.class).removeCssClass(stylable, CLASS);
    Assert.assertEquals(INITIAL_FIRST_CLASS + " " + INITIAL_LAST_CLASS, stylable.getCssClass());
  }

  @Test
  public void testToggleCssClass() {
    String newClasses = BEANS.get(StyleHelper.class).toggleCssClass(INITIAL_CLASSES, ADDED_CLASS, true);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, newClasses);
    newClasses = BEANS.get(StyleHelper.class).toggleCssClass(INITIAL_CLASSES, ADDED_CLASS, true);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, newClasses);
    newClasses = BEANS.get(StyleHelper.class).toggleCssClass(INITIAL_CLASSES, ADDED_CLASS, false);
    Assert.assertEquals(INITIAL_CLASSES, newClasses);
  }

  @Test
  public void testToggleCssClassStylable() {
    IStyleable stylable = new Cell();
    stylable.setCssClass(INITIAL_CLASSES);
    BEANS.get(StyleHelper.class).toggleCssClass(stylable, ADDED_CLASS, true);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, stylable.getCssClass());
    BEANS.get(StyleHelper.class).toggleCssClass(stylable, ADDED_CLASS, true);
    Assert.assertEquals(INITIAL_CLASSES + " " + ADDED_CLASS, stylable.getCssClass());
    BEANS.get(StyleHelper.class).toggleCssClass(stylable, ADDED_CLASS, false);
    Assert.assertEquals(INITIAL_CLASSES, stylable.getCssClass());
  }
}
