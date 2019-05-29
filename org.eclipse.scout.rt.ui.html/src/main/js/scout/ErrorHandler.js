/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.ErrorHandler = function() {
  this.displayError = true;
  this.sendError = false;
};

/**
 * Use this constant to configure whether or not all instances of the ErrorHandler should write
 * to the console. When you've installed a console appender to log4javascript you can set the
 * value to false, because the ErrorHandler also calls $.log.error and thus the appender has
 * already written the message to the console. We don't want to see it twice.
 */
scout.ErrorHandler.CONSOLE_OUTPUT = true;

scout.ErrorHandler.prototype.init = function(options) {
  $.extend(this, options);
};

scout.ErrorHandler.prototype.handle = function(errorMessage, fileName, lineNumber, columnNumber, error) {
  try {
    var errorCode = this.getJsErrorCode(error),
      logStr = this.createLogMessage(errorMessage, fileName, lineNumber, columnNumber, error, errorCode);

    if (error) {
      $.log.error(logStr, error);
    } else {
      $.log.error(logStr);
    }

    // Note: when the null-logger is active it has already written the error to the console
    // when the $.log.error function has been called above, so we don't have to log again here.
    var writeToConsole = scout.ErrorHandler.CONSOLE_OUTPUT;
    if ($.log instanceof scout.NullLogger) {
      writeToConsole = false;
    }
    if (writeToConsole && window.console) {
      window.console.log(logStr);
    }

    // Note: The error handler is installed globally and we cannot tell in which scout session the error happened.
    // We simply use the first scout session to display the message box and log the error. This is not ideal in the
    // multi-session-case (portlet), but currently there is no other way. Besides, this feature is not in use yet.
    if (scout.sessions.length > 0) {
      var session = scout.sessions[0];
      if (this.displayError) {
        this._showMessageBox(session, errorMessage, errorCode, logStr);
      }
      if (this.sendError) {
        this._sendErrorMessage(session, logStr);
      }
    }
  } catch (err) {
    throw new Error('Error in global JavaScript error handler: ' + err.message + ' (original error: ' + errorMessage + ' at ' + fileName + ':' + lineNumber + ')');
  }
};

scout.ErrorHandler.prototype.createLogMessage = function(errorMessage, fileName, lineNumber, columnNumber, error, errorCode) {
  var logStr = errorMessage + ' at ' + fileName + ':' + lineNumber;
  if (error && error.stack) {
    logStr += '\n' + error.stack;
  }
  logStr += '\n(' + 'Code ' + errorCode + ')';
  if (error && error.debugInfo) {
    // Error throwers may put a "debugInfo" string on the error object that is then added to the log string (this is a scout extension).
    logStr += '\n----- Additional debug information: -----\n' + error.debugInfo;
  }
  return logStr;
};

/**
 * Generate a "cool looking" error code from the JS error object, that
 * does not reveal too much technical information, but at least indicates
 * that a JS runtime error has occurred. (In contrast, fatal errors from
 * the server have numeric error codes.)
 */
scout.ErrorHandler.prototype.getJsErrorCode = function(error) {
  if (error) {
    if (error.name === 'EvalError') {
      return 'E1';
    }
    if (error.name === 'InternalError') {
      return 'I2';
    }
    if (error.name === 'RangeError') {
      return 'A3';
    }
    if (error.name === 'ReferenceError') {
      return 'R4';
    }
    if (error.name === 'SyntaxError') {
      return 'S5';
    }
    if (error.name === 'TypeError') {
      return 'T6';
    }
    if (error.name === 'URIError') {
      return 'U7';
    }
  }
  return 'J0';
};

scout.ErrorHandler.prototype._showMessageBox = function(session, errorMessage, errorCode, logMessage) {
  var options = {
    header: session.optText('ui.UnexpectedProblem', 'Internal UI Error'),
    body: scout.strings.join('\n\n',
      session.optText('ui.InternalUiErrorMsg', errorMessage, ' (' + session.optText('ui.ErrorCodeX', 'Code ' + errorCode, errorCode) + ')'),
      session.optText('ui.UiInconsistentMsg', '')),
    yesButtonText: session.optText('ui.Reload', 'Reload'),
    yesButtonAction: scout.reloadPage,
    noButtonText: session.optText('ui.Ignore', 'Ignore'),
    hiddenText: logMessage
  };

  session.showFatalMessage(options, errorCode);
};

scout.ErrorHandler.prototype._sendErrorMessage = function(session, logMessage) {
  session.sendLogRequest(logMessage);
};
