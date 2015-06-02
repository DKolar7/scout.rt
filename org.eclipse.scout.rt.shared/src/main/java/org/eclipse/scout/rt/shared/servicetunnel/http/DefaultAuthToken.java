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
package org.eclipse.scout.rt.shared.servicetunnel.http;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.regex.Pattern;

import org.eclipse.scout.commons.HexUtility;
import org.eclipse.scout.commons.HexUtility.HexOutputStream;
import org.eclipse.scout.commons.SecurityUtility;
import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.platform.Bean;
import org.eclipse.scout.rt.platform.config.CONFIG;
import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.shared.SharedConfigProperties.AuthTokenPrivateKeyProperty;
import org.eclipse.scout.rt.shared.SharedConfigProperties.AuthTokenPublicKeyProperty;
import org.eclipse.scout.rt.shared.SharedConfigProperties.AuthTokenTimeToLifeProperty;

@Bean
public class DefaultAuthToken {

  public static boolean isActive() {
    byte[] privateKey = CONFIG.getPropertyValue(AuthTokenPrivateKeyProperty.class);
    byte[] publicKey = CONFIG.getPropertyValue(AuthTokenPublicKeyProperty.class);
    return privateKey != null || publicKey != null;
  }

  private String m_userId;
  private long m_validUntil;
  private String[] m_customArgs;
  private byte[] m_signature;

  /**
   * @deprecated Do not create manually, use {@code BEANS.get(BindData.class)} instead.
   */
  @Deprecated
  public DefaultAuthToken() {
  }

  public boolean parse(String token) {
    if (!StringUtility.hasText(token)) {
      return false;
    }

    String[] parts = token.split(Pattern.quote("" + partsDelimiter()));
    if (parts == null || parts.length < 3) {
      return false;
    }

    try {
      String userId = new String(HexUtility.decode(parts[0]), "UTF-8");
      long validUntil = Long.parseLong(parts[1], 16);
      String[] customArgs = null;
      if (parts.length > 3) {
        customArgs = Arrays.copyOfRange(parts, 2, parts.length - 1);
        for (int i = 0; i < customArgs.length; i++) {
          customArgs[i] = new String(HexUtility.decode(customArgs[i]), "UTF-8");
        }
      }
      if (customArgs != null && customArgs.length == 0) {
        customArgs = null;
      }
      byte[] signature;
      try {
        signature = HexUtility.decode(parts[parts.length - 1]);
      }
      catch (Exception ex) {
        signature = new byte[0];
      }
      m_userId = userId;
      m_validUntil = validUntil;
      m_customArgs = (customArgs == null ? null : Arrays.copyOf(customArgs, customArgs.length));
      m_signature = signature;
      return true;
    }
    catch (Exception ex) {
      throw new PlatformException("unexpected behaviour", ex);
    }
  }

  /**
   * Init this auth-token with explicit values
   *
   * @param userId
   * @param customArgs
   */
  public void init(String userId, String... customArgs) {
    long tokenTTL = CONFIG.getPropertyValue(AuthTokenTimeToLifeProperty.class);
    m_userId = userId;
    m_validUntil = System.currentTimeMillis() + tokenTTL;
    if (customArgs != null && customArgs.length == 0) {
      customArgs = null;
    }
    m_customArgs = (customArgs == null ? null : Arrays.copyOf(customArgs, customArgs.length));
    try {
      m_signature = sign();
    }
    catch (Exception e) {
      throw new PlatformException("Invalid signature setup", e);
    }
  }

  public byte[] getSignature() {
    return m_signature;
  }

  public String getUserId() {
    return m_userId;
  }

  public long getValidUntil() {
    return m_validUntil;
  }

  public int getCustomArgCount() {
    return m_customArgs == null ? 0 : m_customArgs.length;
  }

  public String getCustomArg(int index) {
    return m_customArgs[index];
  }

  /**
   * According to HTTP spec
   *
   * @see <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html">rfc2616</a>
   */
  protected char partsDelimiter() {
    return ';';
  }

  protected byte[] createUnsignedData() {
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream(); HexOutputStream hex = new HexOutputStream(bytes)) {
      hex.write(m_userId.getBytes("UTF-8"));
      bytes.write(partsDelimiter());
      bytes.write(Long.toHexString(m_validUntil).getBytes());
      if (m_customArgs != null) {
        for (String arg : m_customArgs) {
          bytes.write(partsDelimiter());
          hex.write(arg.getBytes("UTF-8"));
        }
      }
      return bytes.toByteArray();
    }
    catch (IOException ex) {
      throw new PlatformException("unexpected behaviour", ex);
    }
  }

  protected byte[] sign() throws ProcessingException {
    byte[] privateKey = CONFIG.getPropertyValue(AuthTokenPrivateKeyProperty.class);
    return SecurityUtility.createSignature(privateKey, createUnsignedData());
  }

  protected boolean verify() throws ProcessingException {
    byte[] publicKey = CONFIG.getPropertyValue(AuthTokenPublicKeyProperty.class);
    return SecurityUtility.verifySignature(publicKey, createUnsignedData(), getSignature());
  }

  public boolean isValid() {
    if (!isActive()) {
      return false;
    }
    if (getSignature() == null) {
      return false;
    }
    try {
      return verify();
    }
    catch (Exception e) {
      return false;
    }
  }

  @Override
  public String toString() {
    StringBuilder buf = new StringBuilder();
    buf.append(new String(createUnsignedData()));
    buf.append(partsDelimiter());
    buf.append(HexUtility.encode(m_signature));
    return buf.toString();
  }
}
