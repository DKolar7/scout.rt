/*
 * Copyright (c) 2010-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.platform.util;

import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.eclipse.scout.rt.platform.exception.ProcessingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utility class for creating, parsing and converting {@link URI}s and {@link URL}s.
 *
 * @since 3.8.1
 */
public final class UriUtility {

  private static final Logger LOG = LoggerFactory.getLogger(UriUtility.class);
  private static final String DEFAULT_ENCODING = StandardCharsets.UTF_8.name();

  private UriUtility() {
  }

  /**
   * Parses the given URL's query string using encoding UTF_8 and extracts the query parameter.
   *
   * @param uri
   * @return map with parsed query parameters. Never <code>null</code>.
   */
  public static Map<String, String> getQueryParameters(URL url) {
    return getQueryParameters(url, null);
  }

  /**
   * Parses the given URL's query string using the given encoding and extracts the query parameter.
   *
   * @param uri
   * @param encoding
   *          encoding of the query parameter. If <code>null</code> UTF_8 is used.
   * @return map with parsed query parameters. Never <code>null</code>.
   */
  public static Map<String, String> getQueryParameters(URL url, String encoding) {
    if (url == null || url.getQuery() == null) {
      return new HashMap<>(0);
    }
    return getQueryParameters(url.toString(), encoding);
  }

  /**
   * Parses the given URI's query string using encoding UTF_8 and extracts the query parameter.
   *
   * @param uri
   * @return map with parsed query parameters. Never <code>null</code>.
   */
  public static Map<String, String> getQueryParameters(URI uri) {
    return getQueryParameters(uri, null);
  }

  /**
   * Parses the given URI's query string using the given encoding and extracts the query parameter.
   *
   * @param uri
   * @param encoding
   *          encoding of the query parameter. If <code>null</code> UTF-8 is used.
   * @return map with parsed query parameters. Never <code>null</code>.
   */
  public static Map<String, String> getQueryParameters(URI uri, String encoding) {
    if (uri == null || uri.getQuery() == null) {
      return new HashMap<>(0);
    }
    return getQueryParameters(uri.toString(), encoding);
  }

  private static Map<String, String> getQueryParameters(String uri, String encoding) {
    String[] params = getQueryString(uri).split("&");
    Map<String, String> result = new HashMap<>(params.length);
    for (String param : params) {
      if (StringUtility.isNullOrEmpty(param)) {
        continue;
      }
      String[] parts = StringUtility.split(param, "=");
      if (parts.length > 2) {
        throw new ProcessingException("invalid query parameter: '" + param + "'");
      }
      String key = decode(parts[0], encoding);
      String value = parts.length < 2 ? "" : decode(parts[1], encoding);
      String existingMapping = result.put(key, value);
      if (existingMapping != null) {
        LOG.warn("parameter key is used multiple times [key='{}', oldValue='{}', newValue='{}'", key, existingMapping, value);
      }
    }
    return result;
  }

  /**
   * Find exact query string instead of decoded query string from {@link URI#getQuery()} to allow for encoded characters
   * like '=' in query values.
   */
  private static String getQueryString(final String uriString) {
    final int start = uriString.indexOf('?');
    if (start > 0) {
      final int fragmentStart = uriString.indexOf('#', start);
      final int end = fragmentStart > 0 ? fragmentStart : uriString.length();
      return uriString.substring(start + 1, end);
    }
    return "";
  }

  /**
   * Splits the path of the given {@link URI} in its elements.
   *
   * @param uri
   * @return the path elements or an empty string array if the uri or its path is <code>null</code>.
   */
  public static String[] getPath(URI uri) {
    if (uri == null || uri.getPath() == null) {
      return new String[0];
    }
    String path = uri.getPath();
    if (path.startsWith("/")) {
      path = path.substring(1);
    }
    return StringUtility.split(path, "/");
  }

  /**
   * Converts the given URL into an URI.
   *
   * @param url
   * @return <code>null</code> if the given url is <code>null</code>.
   */
  public static URI urlToUri(URL url) {
    if (url == null) {
      return null;
    }
    try {
      return url.toURI();
    }
    catch (URISyntaxException e) {
      throw new ProcessingException("Exception while converting URL to URI", e);
    }
  }

  /**
   * Converts the given URI into an URL.
   *
   * @param uri
   * @return <code>null</code> if the given uri is <code>null</code>.
   */
  public static URL uriToUrl(URI uri) {
    if (uri == null) {
      return null;
    }
    try {
      return uri.toURL();
    }
    catch (MalformedURLException e) {
      throw new ProcessingException("Exception while converting URI to URL", e);
    }
  }

  /**
   * Parses the given string into an {@link URI}.
   *
   * @param uri
   * @return <code>null</code> if the given string is null or has no text or a parsed {@link URI} instance.
   */
  public static URI toUri(String uri) {
    if (!StringUtility.hasText(uri)) {
      return null;
    }
    try {
      return new URI(uri);
    }
    catch (URISyntaxException e) {
      throw new ProcessingException("Exception while parsing URI", e);
    }
  }

  /**
   * Parses the given string into an {@link URL}.
   *
   * @param url
   * @return <code>null</code> if the given string is null or has no text or a parsed {@link URL} instance.
   */
  public static URL toUrl(String url) {
    if (!StringUtility.hasText(url)) {
      return null;
    }
    try {
      return new URL(url);
    }
    catch (MalformedURLException e) {
      throw new ProcessingException("Exception while parsing URL", e);
    }
  }

  /**
   * Delegates to {@link URLDecoder#decode(String, String)} using default encoding.
   *
   * @return the newly decoded String
   */
  public static String decode(String uri) {
    return decode(uri, DEFAULT_ENCODING);
  }

  /**
   * Delegates to {@link URLDecoder#decode(String, String)} using the given encoding.
   *
   * @return the newly decoded String
   */
  public static String decode(String uri, String encoding) {
    if (encoding == null) {
      encoding = DEFAULT_ENCODING;
    }
    try {
      return URLDecoder.decode(uri, encoding);
    }
    catch (UnsupportedEncodingException e) {
      throw new ProcessingException("unsupported encoding '" + encoding + "'", e);
    }
  }

  /**
   * Delegates to {@link URLDecoder#encode(String, String)} using default encoding.
   *
   * @return the newly encoded String
   */
  public static String encode(String uri) {
    return encode(uri, DEFAULT_ENCODING);
  }

  /**
   * Delegates to {@link URLDecoder#encode(String, String)} using the given encoding.
   *
   * @return the newly encoded String
   */
  public static String encode(String uri, String encoding) {
    if (encoding == null) {
      encoding = DEFAULT_ENCODING;
    }
    try {
      return URLEncoder.encode(uri, encoding);
    }
    catch (UnsupportedEncodingException e) {
      throw new ProcessingException("unsupported encoding '" + encoding + "'", e);
    }
  }

}
