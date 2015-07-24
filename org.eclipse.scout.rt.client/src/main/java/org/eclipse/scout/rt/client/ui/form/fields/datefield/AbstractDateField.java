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
package org.eclipse.scout.rt.client.ui.form.fields.datefield;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.annotations.ClassId;
import org.eclipse.scout.commons.annotations.ConfigOperation;
import org.eclipse.scout.commons.annotations.ConfigProperty;
import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.commons.nls.NlsLocale;
import org.eclipse.scout.rt.client.ModelContextProxy;
import org.eclipse.scout.rt.client.ModelContextProxy.ModelContext;
import org.eclipse.scout.rt.client.extension.ui.form.fields.IFormFieldExtension;
import org.eclipse.scout.rt.client.extension.ui.form.fields.datefield.DateFieldChains.DateFieldShiftDateChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.datefield.DateFieldChains.DateFieldShiftTimeChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.datefield.IDateFieldExtension;
import org.eclipse.scout.rt.client.ui.form.fields.AbstractBasicField;
import org.eclipse.scout.rt.client.ui.form.fields.AbstractFormField;
import org.eclipse.scout.rt.client.ui.form.fields.ParsingFailedStatus;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.util.DateUtility;
import org.eclipse.scout.rt.shared.ScoutTexts;

/**
 * A Value field for date and time values.
 * <p>
 * <strong>Note:</strong> By default, all {@link java.util.Date} objects are converted to
 * {@link org.eclipse.scout.rt.shared.servicetunnel.StaticDate StaticDate} during serialization and converted back to
 * <code>Date</code> objects during de-serialization in order to be independent of time zone and daylight saving time.
 * I.e. the string representation of a date stays the same when it is sent through the service tunnel, but not the date
 * itself. {@link org.eclipse.scout.rt.client.ui.form.fields.datefield.AbstractUTCDateField AbstractUTCDateField} can be
 * used instead, if this is not the desired behavior.
 * <p>
 * <strong>Example:</strong>
 * </p>
 * <blockquote>
 *
 * <pre>
 * //Consider a form containing a date field:
 * ...
 * public class MyDateField extends AbstractDateField {
 * }
 * 
 * //Use SimpleDateFormat to get a String representation of the date.
 * Date d = formData.getMyDate().getValue();
 * DateFormat dateFormat = new SimpleDateFormat(&quot;yyyy.MM.dd - HH:mm:ss&quot;, Locale.ENGLISH);
 * String formattedDate = dateFormat.format(d);
 * System.out.println(formattedDate);
 * 
 * //Send the formData to the server using a service:
 * BEANS.get(IMyService.class).load(MyFormData formData)
 * 
 * //Use SimpleDateFormat to get a String representation of the date in the service implementation.
 * public MyFormData load(MyFormData formData) {
 *     Date d = formData.getMyDate().getValue();
 *     DateFormat dateFormat = new SimpleDateFormat(&quot;yyyy.MM.dd - HH:mm:ss&quot;, Locale.ENGLISH);
 *     String formattedDate = dateFormat.format(d);
 *     System.out.println(formattedDate);
 * }
 * //The two println statements result in the same value on server and client independent of the timezone of the client and server.
 * </pre>
 *
 * </blockquote>
 * </p>
 * <p>
 * <strong>Default values:</strong> Default hasDate=true and hasTime=false
 * </p>
 *
 * @see org.eclipse.scout.rt.shared.servicetunnel.ServiceTunnelObjectReplacer ServiceTunnelObjectReplacer
 */
@ClassId("f73eed8c-1e70-4903-a23f-4a29d884e5ea")
public abstract class AbstractDateField extends AbstractBasicField<Date> implements IDateField {
  private static final IScoutLogger LOG = ScoutLogManager.getLogger(AbstractDateField.class);

  private IDateFieldUIFacade m_uiFacade;
  private long m_autoTimeMillis;
  private Date m_autoDate;

  public AbstractDateField() {
    this(true);
  }

  public AbstractDateField(boolean callInitializer) {
    super(callInitializer);
  }

  /**
   * The date/time format, for a description see {@link SimpleDateFormat}
   */
  @ConfigProperty(ConfigProperty.STRING)
  @Order(230)
  protected String getConfiguredFormat() {
    return null;
  }

  @ConfigProperty(ConfigProperty.STRING)
  @Order(231)
  protected String getConfiguredDateFormatPattern() {
    return null;
  }

  @ConfigProperty(ConfigProperty.STRING)
  @Order(232)
  protected String getConfiguredTimeFormatPattern() {
    return null;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(240)
  protected boolean getConfiguredHasDate() {
    return true;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(241)
  protected boolean getConfiguredHasTime() {
    return false;
  }

  /**
   * When a date without time is picked, this time value is used as hh/mm/ss.
   */
  @ConfigProperty(ConfigProperty.LONG)
  @Order(270)
  protected long getConfiguredAutoTimeMillis() {
    return 0;
  }

  /**
   * When a time without date is picked, this date value is used as day.<br>
   * <b>NOTE:</b> in case of null the current date will be taken.
   */
  @Order(270)
  protected Date getConfiguredAutoDate() {
    return null;
  }

  /**
   * Depending whether subclass overrides this method
   * <p>
   * Default is as follows<br>
   * Level 0: shift day up/down [UP, DOWN]<br>
   * Level 1: shift month up/down [shift-UP,shift-DOWN]<br>
   * Level 2: shift year up/down [ctrl-UP,ctrl-DOWN]
   * <p>
   * see {@link #adjustDate(int, int, int)}
   */
  @ConfigOperation
  protected void execShiftDate(int level, int value) throws ProcessingException {
    switch (level) {
      case 0: {
        adjustDate(value, 0, 0);
        break;
      }
      case 1: {
        adjustDate(0, value, 0);
        break;
      }
      case 2: {
        adjustDate(0, 0, value);
        break;
      }
    }
  }

  /**
   * @deprecated This method is never called for {@link IDateField}. The UI is responsible for parsing a date.
   */
  @Override
  @Deprecated
  protected Date execParseValue(String text) throws ProcessingException {
    return super.execParseValue(text);
  }

  /**
   * <b>Important:</b> Make sure that this method only uses formats that are supported by the UI. Otherwise, a formatted
   * date cannot be parsed again.
   */
  @Override
  protected String execFormatValue(Date value) {
    return super.execFormatValue(value);
  }

  /**
   * Depending whether subclass overrides this method
   * <p>
   * Default is as follows<br>
   * Level 0: shift minute up/down [UP, DOWN]<br>
   * Level 1: shift hour up/down [shift-UP, shift-DOWN]<br>
   * Level 2: nop [ctrl-UP, ctrl-DOWN]<br>
   * <p>
   * see {@link #adjustDate(int, int, int)}
   */
  @ConfigOperation
  protected void execShiftTime(int level, int value) throws ProcessingException {
    switch (level) {
      case 0: {
        adjustTime(value, 0, 0);
        break;
      }
      case 1: {
        adjustTime(0, value, 0);
        break;
      }
      case 2: {
        adjustTime(0, 0, value);
        break;
      }
    }
  }

  @Override
  protected void initConfig() {
    m_uiFacade = BEANS.get(ModelContextProxy.class).newProxy(new P_UIFacade(), ModelContext.copyCurrent());
    super.initConfig();

    setFormat(getConfiguredFormat());
    setDateFormatPattern(getConfiguredDateFormatPattern());
    setTimeFormatPattern(getConfiguredTimeFormatPattern());

    setHasDate(getConfiguredHasDate());
    setHasTime(getConfiguredHasTime());
    setAutoTimeMillis(getConfiguredAutoTimeMillis());
    setAutoDate(getConfiguredAutoDate());
  }

  /**
   * UpdateDisplayTextOnModify is not supported for DateTimeField.
   */
  @Override
  public final void setUpdateDisplayTextOnModify(boolean b) {
    super.setUpdateDisplayTextOnModify(b);
    preventUpdateDisplaytextOnModifiyOnDateTimeField();
  }

  @Override
  public void setFormat(String format) {
    format = checkFormatPatternSupported(format);

    String dateFormatPattern = null;
    String timeFormatPattern = null;
    if (format != null) {
      // Try to extract date and time parts of pattern
      int h = format.toLowerCase().indexOf('h');
      if (h >= 0) {
        dateFormatPattern = format.substring(0, h).trim();
        timeFormatPattern = format.substring(h).trim();
      }
      else {
        if (isHasDate()) {
          dateFormatPattern = format;
          timeFormatPattern = null;
          if (isHasTime()) {
            LOG.warn("Could not extract time part from pattern '" + format + "', using default pattern.");
          }
        }
        else {
          dateFormatPattern = null;
          timeFormatPattern = (isHasTime() ? format : null);
        }
      }
    }
    setDateFormatPattern(dateFormatPattern);
    setTimeFormatPattern(timeFormatPattern);
  }

  @Override
  public String getFormat() {
    String s = "";
    if (isHasDate()) {
      s = StringUtility.join(" ", s, getDateFormatPattern());
    }
    if (isHasTime()) {
      s = StringUtility.join(" ", s, getTimeFormatPattern());
    }
    return s;
  }

  @Override
  public void setDateFormatPattern(String dateFormatPattern) {
    dateFormatPattern = checkFormatPatternSupported(dateFormatPattern);
    if (dateFormatPattern == null) {
      dateFormatPattern = getDefaultDateFormatPatternByLocale(NlsLocale.get());
    }
    propertySupport.setPropertyString(PROP_DATE_FORMAT_PATTERN, dateFormatPattern);
    // Always update display text (format may be the same, but language might have changed)
    refreshDisplayText();
  }

  @Override
  public String getDateFormatPattern() {
    return propertySupport.getPropertyString(PROP_DATE_FORMAT_PATTERN);
  }

  @Override
  public void setTimeFormatPattern(String timeFormatPattern) {
    timeFormatPattern = checkFormatPatternSupported(timeFormatPattern);
    if (timeFormatPattern == null) {
      timeFormatPattern = getDefaultTimeFormatPatternByLocale(NlsLocale.get());
    }
    propertySupport.setPropertyString(PROP_TIME_FORMAT_PATTERN, timeFormatPattern);
    // Always update display text (format may be the same, but language might have changed)
    refreshDisplayText();
  }

  @Override
  public String getTimeFormatPattern() {
    return propertySupport.getPropertyString(PROP_TIME_FORMAT_PATTERN);
  }

  protected String checkFormatPatternSupported(String formatPattern) {
    // FIXME BSH How to implement?
    return formatPattern;
  }

  @Override
  public boolean isHasTime() {
    return propertySupport.getPropertyBool(PROP_HAS_TIME);
  }

  @Override
  public void setHasTime(boolean b) {
    propertySupport.setPropertyBool(PROP_HAS_TIME, b);
    preventUpdateDisplaytextOnModifiyOnDateTimeField();
    if (isInitialized()) {
      setValue(getValue());
    }
  }

  private void preventUpdateDisplaytextOnModifiyOnDateTimeField() {
    if (isUpdateDisplayTextOnModify() && isHasDate() && isHasTime()) {
      LOG.error("UpdateDisplayTextOnModify is not supported for combined Date Time Field " + getClass().getName());
      setUpdateDisplayTextOnModify(false);
    }
  }

  @Override
  public boolean isHasDate() {
    return propertySupport.getPropertyBool(PROP_HAS_DATE);
  }

  @Override
  public void setHasDate(boolean b) {
    propertySupport.setPropertyBool(PROP_HAS_DATE, b);
    preventUpdateDisplaytextOnModifiyOnDateTimeField();
    if (isInitialized()) {
      setValue(getValue());
    }
  }

  @Override
  public void setAutoTimeMillis(long l) {
    m_autoTimeMillis = l;
  }

  @Override
  public void setAutoDate(Date d) {
    m_autoDate = d;
  }

  @Override
  public void setAutoTimeMillis(int hour, int minute, int second) {
    setAutoTimeMillis(((hour * 60L + minute) * 60L + second) * 1000L);
  }

  @Override
  public long getAutoTimeMillis() {
    return m_autoTimeMillis;
  }

  public Date getAutoDate() {
    return m_autoDate;
  }

  @Override
  public void adjustDate(int days, int months, int years) {
    Date d = getValue();
    if (d == null) {
      d = applyAutoDate(d);
      d = applyAutoTime(d);
    }
    else {
      Calendar cal = Calendar.getInstance();
      cal.setTime(d);
      cal.add(Calendar.DATE, days);
      cal.add(Calendar.MONTH, months);
      cal.add(Calendar.YEAR, years);
      d = cal.getTime();
    }
    setValue(d);
  }

  @Override
  public void adjustTime(int minutes, int hours, int reserved) {
    Date d = getValue();
    if (d == null) {
      d = applyAutoDate(d);
      d = applyAutoTime(d);
    }
    else {
      Calendar cal = Calendar.getInstance();
      cal.setTime(d);
      cal.add(Calendar.MINUTE, minutes);
      cal.add(Calendar.HOUR_OF_DAY, hours);
      d = cal.getTime();
    }
    setValue(d);
  }

  @Override
  public IDateFieldUIFacade getUIFacade() {
    return m_uiFacade;
  }

  // format value for display
  @Override
  protected String formatValueInternal(Date validValue) {
    if (validValue == null) {
      return "";
    }
    DateFormat df = getDateFormat();
    String displayValue = df.format(validValue);
    return displayValue;
  }

  // validate value for ranges, mandatory, ...
  @Override
  protected Date validateValueInternal(Date rawValue) throws ProcessingException {
    Date validValue = null;
    rawValue = super.validateValueInternal(rawValue);
    if (rawValue != null) {
      try {
        // apply format
//        DateFormat df = getDateFormat();
//        rawValue = df.parse(df.format(rawValue));
      }
      catch (Exception t) {
        // nop, take raw value
      }
    }
    validValue = rawValue;
    return validValue;
  }

  @Override
  public Double getTimeValue() {
    return DateUtility.convertDateToDoubleTime(getValue());
  }

  @Override
  public void setTimeValue(Double d) {
    setValue(DateUtility.convertDoubleTimeToDate(d));
  }

  /**
   * @since Build 200
   * @rn imo, 06.04.2006, only adjust date not date/time
   */
  private Date applyAutoTime(Date d) {
    if (d == null) {
      return d;
    }
    Calendar timeCal = Calendar.getInstance();
    long autoTime = getAutoTimeMillis();
    if (autoTime == 0L && isHasTime()) {
      // use current time
    }
    else {
      timeCal.set(Calendar.MILLISECOND, (int) (autoTime % 1000));
      autoTime = autoTime / 1000;
      timeCal.set(Calendar.SECOND, (int) (autoTime % 60));
      autoTime = autoTime / 60;
      timeCal.set(Calendar.MINUTE, (int) (autoTime % 60));
      autoTime = autoTime / 60;
      timeCal.set(Calendar.HOUR_OF_DAY, (int) (autoTime % 24));
    }
    Calendar c = Calendar.getInstance();
    c.setTime(d);
    c.set(Calendar.MILLISECOND, timeCal.get(Calendar.MILLISECOND));
    c.set(Calendar.SECOND, timeCal.get(Calendar.SECOND));
    c.set(Calendar.MINUTE, timeCal.get(Calendar.MINUTE));
    c.set(Calendar.HOUR_OF_DAY, timeCal.get(Calendar.HOUR_OF_DAY));
    d = c.getTime();
    return d;
  }

  private Date applyAutoDate(Date d) {
    if (d != null) {
      return d;
    }
    d = getAutoDate();
    if (d == null) {
      // use today's date
      d = new Date();
    }
    return d;
  }

  @Override
  public DateFormat getDateFormat() {
    String format = getFormat();
    if (format != null) {
      return new SimpleDateFormat(format, NlsLocale.get());
    }
    return null;
  }

  @Override
  public DateFormat getIsolatedDateFormat() {
    DateFormat f = getDateFormat();
    if (f instanceof SimpleDateFormat) {
      String pat = ((SimpleDateFormat) f).toPattern();
      int h = pat.toLowerCase().indexOf('h');
      if (h >= 0) {
        try {
          return new SimpleDateFormat(pat.substring(0, h).trim(), NlsLocale.get());
        }
        catch (Exception e) {
          LOG.error("could not isolate date pattern from '" + pat + "'", e);
        }
      }
    }
    return f;
  }

  @Override
  public DateFormat getIsolatedTimeFormat() {
    DateFormat f = getDateFormat();
    if (f instanceof SimpleDateFormat) {
      String pat = ((SimpleDateFormat) f).toPattern();
      int h = pat.toLowerCase().indexOf('h');
      if (h >= 0) {
        try {
          return new SimpleDateFormat(pat.substring(h).trim(), NlsLocale.get());
        }
        catch (Exception e) {
          LOG.error("could not isolate time pattern from '" + pat + "'", e);
        }
      }
    }
    return null;
  }

  /**
   * <pre>
   * en-gb    "dd/MM/yyyy"
   * nl-be    "dd/MM/yyyy"
   * 
   * fr-ch    "dd.MM.yyyy"
   * it-ch    "dd.MM.yyyy"
   * 
   * cs       "d.M.yyyy"
   * fi       "d.M.yyyy"
   * 
   * el       "d/M/yyyy"
   * 
   * fa       "yyyy/MM/dd"
   * 
   * hu       "yyyy.MM.dd"
   * 
   * zh       "yyyy-MM-dd"
   * 
   * ca       "dd/MM/yyyy"
   * es       "dd/MM/yyyy"
   * fr       "dd/MM/yyyy"
   * gl       "dd/MM/yyyy"
   * it       "dd/MM/yyyy"
   * nl       "dd-MM-yyyy"
   * vi       "dd/MM/yyyy"
   * 
   * bs       "dd.MM.yyyy"
   * de       "dd.MM.yyyy"
   * et       "dd.MM.yyyy"
   * me       "dd.MM.yyyy"
   * mk       "dd.MM.yyyy"
   * no       "dd.MM.yyyy"
   * pl       "dd.MM.yyyy"
   * rs       "dd.MM.yyyy"
   * ru       "dd.MM.yyyy"
   * sr       "dd.MM.yyyy"
   * tr       "dd.MM.yyyy"
   * uk       "dd.MM.yyyy"
   * 
   * default  "MM/dd/yyyy"
   * </pre>
   */
  protected String getDefaultDateFormatPatternByLocale(Locale locale) {
    if (locale == null) {
      locale = NlsLocale.get();
    }
    String localeName = StringUtility.nvl(locale.toLanguageTag().toLowerCase(), "");

    // Check longer locale names first
    if (localeName.startsWith("en-gb") || localeName.startsWith("nl-be")) {
      return "dd/MM/yyyy";
    }
    if (localeName.startsWith("fr-ch") || localeName.startsWith("it-ch")) {
      return "dd.MM.yyyy";
    }

    // Now check short names
    if (localeName.startsWith("cs") || localeName.startsWith("fi")) {
      return "d.M.yyyy";
    }
    if (localeName.startsWith("el")) {
      return "d/M/yyyy";
    }
    if (localeName.startsWith("fa")) {
      return "yyyy/MM/dd";
    }
    if (localeName.startsWith("hu")) {
      return "yyyy.MM.dd";
    }
    if (localeName.startsWith("zh")) {
      return "yyyy-MM-dd";
    }
    if (localeName.startsWith("no")
        || localeName.startsWith("pl")
        || localeName.startsWith("rs")
        || localeName.startsWith("ru")
        || localeName.startsWith("sr")
        || localeName.startsWith("tr")
        || localeName.startsWith("uk")
        || localeName.startsWith("me")
        || localeName.startsWith("mk")
        || localeName.startsWith("et")
        || localeName.startsWith("de")
        || localeName.startsWith("bs")) {
      return "dd.MM.yyyy";
    }
    if (localeName.startsWith("es")
        || localeName.startsWith("ca")
        || localeName.startsWith("it")
        || localeName.startsWith("fr")
        || localeName.startsWith("gl")
        || localeName.startsWith("vi")) {
      return "dd/MM/yyyy";
    }
    if (localeName.startsWith("nl")) {
      return "dd-MM-yyyy";
    }

    // Default format
    return "MM/dd/yyyy";
  }

  /**
   * <pre>
   * en       "h:mm a"
   * 
   * default  "hh:mm"
   * </pre>
   */
  protected String getDefaultTimeFormatPatternByLocale(Locale locale) {
    if (locale == null) {
      locale = NlsLocale.get();
    }
    String localeName = StringUtility.nvl(locale.toLanguageTag().toLowerCase(), "");

    if (localeName.startsWith("en")) {
      return "h:mm a";
    }

    // Default format
    return "HH:mm";
  }

  private class P_UIFacade extends AbstractBasicField.P_UIFacade implements IDateFieldUIFacade {

    @Override
    public void setDateTimeFromUI(Date date) {
      try {
        setValue(date);
      }
      catch (Exception e) {
        BEANS.get(ExceptionHandler.class).handle(new ProcessingException("Unexpected", e));
      }
    }

    @Override
    public void fireDateShiftActionFromUI(int level, int value) {
      try {
        interceptShiftDate(level, value);
      }
      catch (Exception e) {
        BEANS.get(ExceptionHandler.class).handle(e);
      }
    }

    @Override
    public void fireTimeShiftActionFromUI(int level, int value) {
      try {
        interceptShiftTime(level, value);
      }
      catch (Exception e) {
        BEANS.get(ExceptionHandler.class).handle(e);
      }
    }

    @Override
    public void setParseErrorFromUI(String invalidDisplayText, String invalidDateText, String invalidTimeText) {
      ParsingFailedStatus status = new ParsingFailedStatus(
          ScoutTexts.get("InvalidValueMessageX", StringUtility.nvl(invalidDisplayText, StringUtility.join(" ", invalidDateText, invalidTimeText))),
          invalidDateText + "\n" + invalidTimeText); // don't use join()!
      addErrorStatus(status);
    }

    @Override
    public void removeParseErrorFromUI() {
      removeErrorStatus(ParsingFailedStatus.class);
    }
  }

  protected final void interceptShiftTime(int level, int value) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    DateFieldShiftTimeChain chain = new DateFieldShiftTimeChain(extensions);
    chain.execShiftTime(level, value);
  }

  protected final void interceptShiftDate(int level, int value) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    DateFieldShiftDateChain chain = new DateFieldShiftDateChain(extensions);
    chain.execShiftDate(level, value);
  }

  protected static class LocalDateFieldExtension<OWNER extends AbstractDateField> extends LocalBasicFieldExtension<Date, OWNER> implements IDateFieldExtension<OWNER> {

    public LocalDateFieldExtension(OWNER owner) {
      super(owner);
    }

    @Override
    public void execShiftTime(DateFieldShiftTimeChain chain, int level, int value) throws ProcessingException {
      getOwner().execShiftTime(level, value);
    }

    @Override
    public void execShiftDate(DateFieldShiftDateChain chain, int level, int value) throws ProcessingException {
      getOwner().execShiftDate(level, value);
    }
  }

  @Override
  protected IDateFieldExtension<? extends AbstractDateField> createLocalExtension() {
    return new LocalDateFieldExtension<AbstractDateField>(this);
  }
}
