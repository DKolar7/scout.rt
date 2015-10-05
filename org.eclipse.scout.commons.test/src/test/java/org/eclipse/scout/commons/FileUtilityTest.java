/*******************************************************************************
 * Copyright (c) 2012 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Stephan Merkli - initial API and implementation
 *     Stephan Leicht Vogt - Correction for tycho surefire testing
 ******************************************************************************/
package org.eclipse.scout.commons;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.File;

import org.eclipse.scout.commons.utility.TestUtility;

import org.junit.Test;

/**
 * JUnit tests for {@link FileUtility}
 *
 * @since 3.9.0
 */
public class FileUtilityTest {

  private static final String FILE_NAME = "fooBar.txt";
  private static final String FILE_NAME_MULTIPLE_DOTS = "foo.bar.txt";
  private static final String FILE_NAME_NO_EXT = "fooBar";

  @Test
  public void testIsZipFile() throws Exception {
    File zipFile = null;
    File noZipFile = null;
    try {
      zipFile = TestUtility.createTempFileFromFilename("org/eclipse/scout/commons/zip.zip", getClass());
      noZipFile = TestUtility.createTempFileFromFilename("org/eclipse/scout/commons/nozip.zip", getClass());
      assertTrue("zip.zip is not a zip file", FileUtility.isZipFile(zipFile));
      assertFalse("nozip.zip is a zip file", FileUtility.isZipFile(noZipFile));
    }
    finally {
      TestUtility.deleteTempFile(zipFile);
      TestUtility.deleteTempFile(noZipFile);
    }
  }

  @Test
  public void testGetFileExtension_String() {
    assertEquals("txt", FileUtility.getFileExtension(FILE_NAME));
    assertEquals("txt", FileUtility.getFileExtension(FILE_NAME_MULTIPLE_DOTS));
    assertNull(FileUtility.getFileExtension(FILE_NAME_NO_EXT));
    assertNull(FileUtility.getFileExtension((String) null));
  }

  @Test
  public void testGetFileExtension_File() {
    assertEquals("txt", FileUtility.getFileExtension(new File(FILE_NAME)));
    assertEquals("txt", FileUtility.getFileExtension(new File(FILE_NAME_MULTIPLE_DOTS)));
    assertNull(FileUtility.getFileExtension((File) new File(FILE_NAME_NO_EXT)));
    assertNull(FileUtility.getFileExtension((File) null));
  }

  @Test
  public void testGetFilenameParts_String() {
    String[] tmp = FileUtility.getFilenameParts(FILE_NAME);
    assertEquals("fooBar", tmp[0]);
    assertEquals("txt", tmp[1]);
    assertNull(FileUtility.getFilenameParts((String) null));
    // other tests already covered by testGetFileExtension_String
  }

  @Test
  public void testGetFilenameParts_File() {
    String[] tmp = FileUtility.getFilenameParts(new File(FILE_NAME));
    assertEquals("fooBar", tmp[0]);
    assertEquals("txt", tmp[1]);
    assertNull(FileUtility.getFilenameParts((File) null));
    // other tests already covered by testGetFileExtension_File
  }

}
