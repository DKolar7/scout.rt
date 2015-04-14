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
package org.eclipse.scout.rt.client.services.common.exceptionhandler;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.UndeclaredThrowableException;
import java.net.MalformedURLException;
import java.net.NoRouteToHostException;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.security.GeneralSecurityException;
import java.util.concurrent.atomic.AtomicBoolean;

import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.annotations.Internal;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.exception.VetoException;
import org.eclipse.scout.rt.client.ui.messagebox.MessageBox;
import org.eclipse.scout.rt.platform.Bean;
import org.eclipse.scout.rt.shared.ScoutTexts;
import org.eclipse.scout.rt.shared.servicetunnel.HttpException;
import org.eclipse.scout.rt.shared.servicetunnel.VersionMismatchException;

/**
 * Popup to visualize an error.
 */
@Bean
public class ErrorPopup {

  private final AtomicBoolean m_parsed = new AtomicBoolean();
  protected String m_title;
  protected String m_text;
  protected String m_detail;
  protected String m_acceptText;
  protected String m_copyPasteText;
  protected ProcessingException m_cause;

  /**
   * Opens the popup to desribe the error.
   */
  public void showMessageBox(Throwable error) {
    ensureErrorParsed(error);

    MessageBox mbox = new MessageBox(
        m_title,
        m_text,
        m_detail,
        m_acceptText,
        null,
        null,
        m_copyPasteText,
        null
        );
    mbox.setSeverity(m_cause.getStatus().getSeverity());
    mbox.startMessageBox();
  }

  @Internal
  protected void ensureErrorParsed(Throwable exception) {
    if (!m_parsed.compareAndSet(false, true)) {
      return;
    }

    if (exception instanceof UndeclaredThrowableException) {
      exception = ((UndeclaredThrowableException) exception).getCause();
    }
    if (exception instanceof ProcessingException) {
      m_cause = (ProcessingException) exception;
    }
    else {
      m_cause = new ProcessingException(ScoutTexts.get("Error"), ScoutTexts.get("ErrorAndRetryTextDefault"), exception);
    }
    m_text = m_cause.getStatus().getTitle();
    if (m_text == null || m_text.length() == 0) {
      m_text = ScoutTexts.get("Error");
    }
    m_detail = m_cause.getStatus().getMessage();
    m_acceptText = ScoutTexts.get("Ok");
    Throwable t = exception;
    while (t != null) {
      String msg = "\n\n" + StringUtility.wrapWord(ScoutTexts.get("OriginalErrorMessageIs", t.getClass().getSimpleName() + " " + t.getLocalizedMessage()), 80);
      if (t instanceof HttpException) {
        int statusCode = ((HttpException) t).getStatusCode();
        switch (statusCode) {
          case 401:
          case 403: {
            m_title = ScoutTexts.get("ErrorTitleLogin");
            m_text = ScoutTexts.get("ErrorTextLogin") + msg;
            break;
          }
          default: {
            m_title = ScoutTexts.get("NetErrorTitle");
            m_text = ScoutTexts.get("NetErrorText") + msg;
            m_detail = ScoutTexts.get("NetErrorInfo");
          }
        }
        return;
      }
      else if (t instanceof GeneralSecurityException) {
        m_title = ScoutTexts.get("ErrorTitleLogin");
        m_text = ScoutTexts.get("ErrorTextLogin") + msg;
        return;
      }
      else if (t instanceof SecurityException) {
        m_title = ScoutTexts.get("ErrorTitleSecurity");
        m_text = ScoutTexts.get("ErrorTextSecurity") + msg;
        return;
      }
      else if (t instanceof MalformedURLException) {
        m_title = ScoutTexts.get("NetErrorTitle");
        m_text = ScoutTexts.get("NetErrorText") + msg;
        m_detail = ScoutTexts.get("NetErrorInfo");
        return;
      }
      else if (t instanceof InterruptedException) {
        m_title = ScoutTexts.get("InterruptedErrorTitle");
        m_text = ScoutTexts.get("InterruptedErrorText");
        return;
      }
      else if (t instanceof UnknownHostException) {
        m_title = ScoutTexts.get("NetErrorTitle");
        m_text = ScoutTexts.get("NetErrorText") + msg;
        m_detail = ScoutTexts.get("NetErrorInfo");
        return;
      }
      else if (t instanceof FileNotFoundException) {
        m_title = ScoutTexts.get("FileNotFoundTitle");
        m_text = ScoutTexts.get("FileNotFoundMessage", ((FileNotFoundException) t).getMessage());
        return;
      }
      else if (t instanceof NoRouteToHostException) {
        m_title = ScoutTexts.get("NetErrorTitle");
        m_text = ScoutTexts.get("NetErrorText") + msg;
        m_detail = ScoutTexts.get("NetErrorInfo");
        return;
      }
      else if (t instanceof SocketException) {
        m_title = ScoutTexts.get("NetErrorTitle");
        m_text = ScoutTexts.get("NetErrorText") + msg;
        m_detail = ScoutTexts.get("NetErrorInfo");
        return;
      }
      else if (t instanceof UserInterruptedException) {
        m_title = ScoutTexts.get("IOErrorTitle");
        m_text = UserInterruptedException.class.getSimpleName();
        m_detail = ScoutTexts.get("IOErrorInfo");
        return;
      }
      else if (t instanceof IOException) {
        m_title = ScoutTexts.get("IOErrorTitle");
        m_text = ScoutTexts.get("IOErrorText") + ": " + t.getLocalizedMessage() + msg;
        m_detail = ScoutTexts.get("IOErrorInfo");
        return;
      }
      else if (t instanceof VersionMismatchException) {
        VersionMismatchException ve = (VersionMismatchException) t;
        m_title = ScoutTexts.get("VersionMismatchTitle");
        m_text = ScoutTexts.get("VersionMismatchTextXY", ve.getOldVersion(), ve.getNewVersion());
        m_detail = null;
        return;
      }
      else if (t instanceof VetoException) {
        m_text = ((VetoException) t).getStatus().getTitle();
        if (StringUtility.hasText(((VetoException) t).getStatus().getMessage())) {
          m_detail = ((VetoException) t).getStatus().getMessage();
        }
        else {
          m_detail = ScoutTexts.get("VetoErrorText") + msg;
        }
        return;
      }
      t = t.getCause();
    }
    // default proceed
    StringWriter buf = new StringWriter();
    t = exception;
    String indent = "";
    while (t != null) {
      String s = null;
      if (t instanceof ProcessingException) {
        s = ((ProcessingException) t).getStatus().getMessage();
      }
      else {
        s = t.getMessage();
      }
      buf.append(indent);
      if (s != null) {
        buf.append(s + (t.getClass() != ProcessingException.class ? " (" + t.getClass().getSimpleName() + ")" : ""));
      }
      else {
        buf.append(t.getClass().getSimpleName());
      }
      buf.append("\n");
      // next
      indent += "  ";
      t = t.getCause();
    }
    m_detail = StringUtility.wrapWord(ScoutTexts.get("OriginalErrorMessageIs", buf.toString()), 120);
    // copy-paste
    m_copyPasteText = createCopyPasteText(m_text, m_detail, m_cause);
  }

  private String createCopyPasteText(String text, String detail, Throwable cause) {
    StringWriter logText = new StringWriter();
    logText.append(m_title + "\n");
    logText.append("\n");
    if (text != null) {
      logText.append(text + "\n");
      logText.append("\n");
    }
    if (detail != null) {
      logText.append(detail + "\n");
      logText.append("\n");
    }
    if (cause != null) {
      cause.printStackTrace(new PrintWriter(logText, true));
      logText.append("\n");
    }
    return logText.toString();
  }
}
