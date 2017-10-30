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
package org.eclipse.scout.rt.platform.resource;

import java.util.Arrays;
import java.util.Collection;

/**
 * Enumeration for a few well-known extensions and their mime types.
 */
public enum MimeType {
  APPCACHE("text/cache-manifest", "appcache"),
  APPLICATION_OCTET_STREAM("application/octet-stream", "bin"),
  AVI("video/avi", "avi"),
  BMP("image/bmp", "bmp"),
  CSS("text/css", "css"),
  CSV("text/csv", "csv"),
  DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
  DOTX("application/vnd.openxmlformats-officedocument.wordprocessingml.template", "dotx"),
  EML("message/rfc822", "eml"),
  GIF("image/gif", "gif"),
  GZ("application/gzip", "gz"),
  HTML("text/html", "html"),
  HTM("text/html", "htm"),
  ICO("image/x-icon", "ico"),
  ICS("text/calendar", "ics"),
  IFB("text/calendar", "ifb"),
  JAR("application/java-archive", "jar"),
  JPG("image/jpeg", "jpg"),
  JPE("image/jpeg", "jpe"),
  JPEG("image/jpeg", "jpeg"),
  JS("application/javascript", "js"),
  JSON("application/json", "json"),
  JSONML("application/jsonml+json", "jsonml"),
  LOG("text/x-log", "log"),
  M2V("video/mpeg", "m2v"),
  MIME("message/rfc822", "mime"),
  MKV("video/x-matroska", "mkv"),
  MOV("video/quicktime", "mov"),
  MP4("video/mp4", "mp4"),
  MPG("video/mpeg", "mpg"),
  MSG("application/vnd.ms-outlook", "msg"),
  ONEPKG("application/onenote", "onepkg"),
  ONETMP("application/onenote", "onetmp"),
  ONETOC("application/onenote", "onetoc"),
  ONETOC2("application/onenote", "onetoc2"),
  PDF("application/pdf", "pdf"),
  PNG("image/png", "png"),
  POTX("application/vnd.openxmlformats-officedocument.presentationml.template", "potx"),
  PPSX("application/vnd.openxmlformats-officedocument.presentationml.slideshow", "ppsx"),
  PPTX("application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"),
  RSS("application/rss+xml", "rss"),
  SLDX("application/vnd.openxmlformats-officedocument.presentationml.slide", "sldx"),
  SVG("image/svg+xml", "svg"),
  THMX("application/vnd.openxmlformats-officedocument.presentationml.presentation", "thmx"),
  TIF("image/tiff", "tif"),
  TIFF("image/tiff", "tiff"),
  TXT("text/plain", "txt"),
  VCARD("text/vcard", "vcard"),
  VCF("text/x-vcard", "vcf"),
  VCS("text/x-vcalendar", "vcs"),
  WOFF("application/font-woff", "woff"),
  XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
  XLTX("application/vnd.openxmlformats-officedocument.spreadsheetml.template", "xltx"),
  XML("text/xml", "xml"),
  ZIP("application/zip", "zip");

  private final String m_type;
  private final String m_fileExtension;

  MimeType(String type, String fileExtension) {
    m_type = type;
    m_fileExtension = fileExtension;
  }

  public String getType() {
    return m_type;
  }

  public String getFileExtension() {
    return m_fileExtension;
  }

  public static MimeType findByFileExtension(String fileExtension) {
    for (MimeType mimeType : values()) {
      if (mimeType.getFileExtension().equalsIgnoreCase(fileExtension)) {
        return mimeType;
      }
    }
    return null;
  }

  public static MimeType convertToMimeType(String mimeTypeText) {
    for (MimeType mimeType : values()) {
      if (mimeType.getType().equals(mimeTypeText)) {
        return mimeType;
      }
    }
    return null;
  }

  /**
   * Common image mime types.
   */
  public static Collection<MimeType> getCommonImageTypes() {
    return Arrays.asList(getCommonImageTypesAsArray());
  }

  /**
   * Common image mime types.
   */
  public static MimeType[] getCommonImageTypesAsArray() {
    return new MimeType[]{BMP, GIF, JPG, JPE, JPEG, PNG, SVG, TIF, TIFF};
  }

  /**
   * Common video mime types.
   */
  public static Collection<MimeType> getCommonVideoTypes() {
    return Arrays.asList(getCommonVideoTypesAsArray());
  }

  /**
   * Common image mime types.
   */
  public static MimeType[] getCommonVideoTypesAsArray() {
    return new MimeType[]{AVI, M2V, MKV, MOV, MP4, MPG};
  }

  public static boolean isOneOf(Collection<MimeType> mimeTypes, String input) {
    for (MimeType mimeType : mimeTypes) {
      if (mimeType.getType().equals(input)) {
        return true;
      }
    }
    return false;
  }
}
