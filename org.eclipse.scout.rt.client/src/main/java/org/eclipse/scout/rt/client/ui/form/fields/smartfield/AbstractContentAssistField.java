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
package org.eclipse.scout.rt.client.ui.form.fields.smartfield;

import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.util.ArrayList;
import java.util.List;

import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.ConfigurationUtility;
import org.eclipse.scout.commons.EventListenerList;
import org.eclipse.scout.commons.IRunnable;
import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.TriState;
import org.eclipse.scout.commons.annotations.ConfigOperation;
import org.eclipse.scout.commons.annotations.ConfigProperty;
import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.annotations.ScoutSdkIgnore;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.commons.exception.VetoException;
import org.eclipse.scout.commons.holders.Holder;
import org.eclipse.scout.commons.status.IStatus;
import org.eclipse.scout.commons.status.Status;
import org.eclipse.scout.rt.client.context.ClientRunContexts;
import org.eclipse.scout.rt.client.extension.ui.form.fields.IFormFieldExtension;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldBrowseNewChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldFilterBrowseLookupResultChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldFilterKeyLookupResultChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldFilterLookupResultChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldFilterRecLookupResultChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldFilterTextLookupResultChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldPrepareBrowseLookupChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldPrepareKeyLookupChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldPrepareLookupChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldPrepareRecLookupChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.ContentAssistFieldChains.ContentAssistFieldPrepareTextLookupChain;
import org.eclipse.scout.rt.client.extension.ui.form.fields.smartfield.IContentAssistFieldExtension;
import org.eclipse.scout.rt.client.job.ModelJobs;
import org.eclipse.scout.rt.client.services.lookup.FormFieldProvisioningContext;
import org.eclipse.scout.rt.client.services.lookup.ILookupCallProvisioningService;
import org.eclipse.scout.rt.client.session.ClientSessionProvider;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.form.fields.AbstractFormField;
import org.eclipse.scout.rt.client.ui.form.fields.AbstractValueField;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.exception.ExceptionHandler;
import org.eclipse.scout.rt.platform.exception.ProcessingExceptionTranslator;
import org.eclipse.scout.rt.platform.job.IFuture;
import org.eclipse.scout.rt.shared.ScoutTexts;
import org.eclipse.scout.rt.shared.data.basic.FontSpec;
import org.eclipse.scout.rt.shared.data.form.ValidationRule;
import org.eclipse.scout.rt.shared.services.common.code.CODES;
import org.eclipse.scout.rt.shared.services.common.code.ICodeType;
import org.eclipse.scout.rt.shared.services.lookup.CodeLookupCall;
import org.eclipse.scout.rt.shared.services.lookup.ILookupCall;
import org.eclipse.scout.rt.shared.services.lookup.ILookupCallFetcher;
import org.eclipse.scout.rt.shared.services.lookup.ILookupRow;
import org.eclipse.scout.rt.shared.services.lookup.LookupRow;

/**
 * This class is not thought to directly subclass. Use {@link AbstractSmartField} or {@link AbstractProposalField}
 * instead.
 */
@ScoutSdkIgnore
public abstract class AbstractContentAssistField<VALUE, LOOKUP_KEY> extends AbstractValueField<VALUE>implements IContentAssistField<VALUE, LOOKUP_KEY> {

  /**
   * Null object used for {@link #installLookupRowContext(ILookupRow)}.
   */
  private final ILookupRow<LOOKUP_KEY> EMPTY_LOOKUP_ROW = new LookupRow<LOOKUP_KEY>(null, "");

  private final EventListenerList m_listenerList = new EventListenerList();

  // chooser security
  private Class<? extends ICodeType<?, LOOKUP_KEY>> m_codeTypeClass;
  private ILookupCall<LOOKUP_KEY> m_lookupCall;

  // cached lookup row
  private IContentAssistFieldLookupRowFetcher<LOOKUP_KEY> m_lookupRowFetcher;
  private IProposalChooserProvider<LOOKUP_KEY> m_proposalChooserProvider;
  private int m_maxRowCount;
  private String m_browseNewText;
  private boolean m_installingRowContext = false;
  private LookupRow m_decorationRow;

  private TriState m_activeFilter;
  private boolean m_activeFilterEnabled;
  private boolean m_browseAutoExpandAll;
  private boolean m_browseHierarchy;
  private boolean m_loadIncremental;
  private int m_proposalFormHeight;

  private ILookupRow<LOOKUP_KEY> m_currentLookupRow;

  private Class<? extends IContentAssistFieldTable<VALUE>> m_contentAssistTableClazz;

  public AbstractContentAssistField() {
    this(true);
  }

  public AbstractContentAssistField(boolean callInitializer) {
    super(callInitializer);
  }

  /*
   * Configuration
   */
  @ConfigProperty(ConfigProperty.ICON_ID)
  @Order(270)
  protected String getConfiguredBrowseIconId() {
    return null;
  }

  /**
   * Configures whether the field may display multiple lines of text.<br>
   * <p>
   * Subclasses can override this method. Default is false.
   *
   * @since 5.1
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(290)
  protected boolean getConfiguredMultilineText() {
    return false;
  }

  /**
   * valid when configuredBrowseHierarchy=true
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(280)
  protected boolean getConfiguredBrowseAutoExpandAll() {
    return true;
  }

  /**
   * valid when configuredBrowseHierarchy=true
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(240)
  protected boolean getConfiguredBrowseLoadIncremental() {
    return false;
  }

  /**
   * If this method is not overwritten, and the content assist field has a codeType then the value of browseHierarchy is
   * automatically determined by {@link ICodeType#isHierarchy()}
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(310)
  protected boolean getConfiguredBrowseHierarchy() {
    return false;
  }

  /**
   * When the smart proposal finds no matching records and this property is not null, then it displays a link or menu
   * with this label.<br>
   * When clicked the method {@link #interceptBrowseNew(String)} is invoked, which in most cases is implemented as
   * opening a "New XY..." dialog
   */
  @ConfigProperty(ConfigProperty.STRING)
  @Order(315)
  protected String getConfiguredBrowseNewText() {
    return null;
  }

  /**
   * variant A: lookup by code type
   */
  @ConfigProperty(ConfigProperty.CODE_TYPE)
  @Order(260)
  @ValidationRule(ValidationRule.CODE_TYPE)
  protected Class<? extends ICodeType<?, LOOKUP_KEY>> getConfiguredCodeType() {
    return null;
  }

  /**
   * variant B: lookup by backend lookup service<br>
   * 3.0: no support for {@code<eval>} tags anymore<br>
   * 3.0: still valid are {@code<text><key><all><rec>} tags in lookup statements in the backend
   */
  @ConfigProperty(ConfigProperty.LOOKUP_CALL)
  @Order(250)
  @ValidationRule(ValidationRule.LOOKUP_CALL)
  protected Class<? extends ILookupCall<LOOKUP_KEY>> getConfiguredLookupCall() {
    return null;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(265)
  protected int getConfiguredBrowseMaxRowCount() {
    return 100;
  }

  /**
   * @return true: inactive rows are display together with active rows<br>
   *         false: inactive rows ae only displayed when selected by the model
   */
  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(270)
  protected boolean getConfiguredActiveFilterEnabled() {
    return false;
  }

  /**
   * @return default height: 280
   */
  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(280)
  protected int getConfiguredProposalFormHeight() {
    return 280;
  }

  @Order(290)
  protected Class<? extends IContentAssistFieldTable<VALUE>> getConfiguredContentAssistTable() {
    return null;
  }

  /**
   * see {@link #getConfiguredBrowseNewText()}<br>
   * In most cases this method is implemented as opening a "New XY..." dialog.
   * <p>
   * The smartfield waits for the return of this method:<br>
   * If null, it does nothing.<br>
   * If {@link LookupRow#getKey()} is set, this key is set as the smartfields new value.<br>
   * If {@link LookupRow#getText()} is set, this text is used as a search text and a parse is performed.
   */
  @ConfigOperation
  @Order(225)
  protected ILookupRow<LOOKUP_KEY> execBrowseNew(String searchText) throws ProcessingException {
    return null;
  }

  /**
   * called before any lookup is performed (key, text, browse)
   */
  @ConfigOperation
  @Order(230)
  protected void execPrepareLookup(ILookupCall<LOOKUP_KEY> call) throws ProcessingException {
  }

  /**
   * called before key lookup but after prepareLookup()
   */
  @ConfigOperation
  @Order(240)
  protected void execPrepareKeyLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY key) throws ProcessingException {
  }

  /**
   * called before text lookup but after prepareLookup()
   */
  @ConfigOperation
  @Order(250)
  protected void execPrepareTextLookup(ILookupCall<LOOKUP_KEY> call, String text) throws ProcessingException {
  }

  /**
   * called before browse lookup but after prepareLookup()
   */
  @ConfigOperation
  @Order(260)
  protected void execPrepareBrowseLookup(ILookupCall<LOOKUP_KEY> call, String browseHint) throws ProcessingException {
  }

  /**
   * called before rec lookup but after prepareLookup()
   */
  @ConfigOperation
  @Order(270)
  protected void execPrepareRecLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY parentKey) throws ProcessingException {
  }

  /**
   * @param call
   *          that produced this result
   * @param result
   *          live list containing the result rows. Add, remove, set, replace and clear of entries in this list is
   *          supported
   */
  @ConfigOperation
  @Order(280)
  protected void execFilterLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
  }

  /**
   * @param call
   *          that produced this result
   * @param result
   *          live list containing the result rows. Add, remove, set, replace and clear of entries in this list is
   *          supported
   */
  @ConfigOperation
  @Order(290)
  protected void execFilterKeyLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
  }

  /**
   * @param call
   *          that produced this result
   * @param result
   *          live list containing the result rows. Add, remove, set, replace and clear of entries in this list is
   *          supported
   */
  @ConfigOperation
  @Order(300)
  protected void execFilterTextLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
  }

  /**
   * @param call
   *          that produced this result
   * @param result
   *          live list containing the result rows. Add, remove, set, replace and clear of entries in this list is
   *          supported
   */
  @ConfigOperation
  @Order(310)
  protected void execFilterBrowseLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
  }

  /**
   * @param call
   *          that produced this result
   * @param result
   *          live list containing the result rows. Add, remove, set, replace and clear of entries in this list is
   *          supported
   */
  @ConfigOperation
  @Order(320)
  protected void execFilterRecLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
  }

  @Override
  public boolean acceptBrowseHierarchySelection(LOOKUP_KEY value, int level, boolean leaf) {
    return true;
  }

  // override to freeze
  /**
   * @deprecated no replacement. Will be removed in the O-Release.
   */
  @SuppressWarnings("deprecation")
  @Deprecated
  @Override
  protected final boolean getConfiguredAutoDisplayText() {
    return true;
  }

  @Override
  public void setTooltipText(String text) {
    super.setTooltipText(text);
    if (!m_installingRowContext) {
      //Ticket 85'572: background color gets reseted after selecting a value
      m_decorationRow.withTooltipText(getTooltipText());
    }
  }

  @Override
  public void setBackgroundColor(String c) {
    super.setBackgroundColor(c);
    if (!m_installingRowContext) {
      //Ticket 85'572: background color gets reseted after selecting a value
      m_decorationRow.withBackgroundColor(getBackgroundColor());
    }
  }

  @Override
  public void setForegroundColor(String c) {
    super.setForegroundColor(c);
    if (!m_installingRowContext) {
      //Ticket 85'572: background color gets reseted after selecting a value
      m_decorationRow.withForegroundColor(getForegroundColor());
    }
  }

  @Override
  public void setFont(FontSpec f) {
    super.setFont(f);
    if (!m_installingRowContext) {
      //Ticket 85'572: background color gets reseted after selecting a value
      m_decorationRow.withFont(getFont());
    }
  }

  @SuppressWarnings("unchecked")
  @Override
  protected void initConfig() {
    m_activeFilter = TriState.TRUE;
    m_decorationRow = new LookupRow<LOOKUP_KEY>(null, "");
    super.initConfig();
    setActiveFilterEnabled(getConfiguredActiveFilterEnabled());
    setBrowseHierarchy(getConfiguredBrowseHierarchy());
    setBrowseAutoExpandAll(getConfiguredBrowseAutoExpandAll());
    setBrowseIconId(getConfiguredBrowseIconId());
    setBrowseLoadIncremental(getConfiguredBrowseLoadIncremental());
    setMultilineText(getConfiguredMultilineText());
    setBrowseMaxRowCount(getConfiguredBrowseMaxRowCount());
    setBrowseNewText(getConfiguredBrowseNewText());
    setProposalChooserProvider(createProposalChooserProvider());
    setProposalFormHeight(getConfiguredProposalFormHeight());
    // content assist table
    Class<? extends IContentAssistFieldTable<VALUE>> contentAssistTableClazz = getConfiguredContentAssistTable();
    // if no table is configured try to find a fitting inner class
    if (contentAssistTableClazz == null) {
      // try to find inner class
      Class[] dca = ConfigurationUtility.getDeclaredPublicClasses(getClass());
      contentAssistTableClazz = (Class<? extends IContentAssistFieldTable<VALUE>>) ConfigurationUtility.filterClass(dca, IContentAssistFieldTable.class);
    }
    // if no inner class use default
    if (contentAssistTableClazz == null) {
      contentAssistTableClazz = (Class<? extends IContentAssistFieldTable<VALUE>>) ContentAssistFieldTable.class;
    }
    setContentAssistTableClass(contentAssistTableClazz);
    IContentAssistFieldLookupRowFetcher<LOOKUP_KEY> lookupRowFetcher = createLookupRowFetcher();
    lookupRowFetcher.addPropertyChangeListener(new P_LookupRowFetcherPropertyListener());
    setLookupRowFetcher(lookupRowFetcher);
    // code type
    if (getConfiguredCodeType() != null) {
      setCodeTypeClass(getConfiguredCodeType());
    }
    // lookup call
    Class<? extends ILookupCall<LOOKUP_KEY>> lookupCallClass = getConfiguredLookupCall();
    if (lookupCallClass != null) {
      try {
        ILookupCall<LOOKUP_KEY> call = BEANS.get(lookupCallClass);
        setLookupCall(call);
      }
      catch (Exception e) {
        BEANS.get(ExceptionHandler.class).handle(new ProcessingException("error creating instance of class '" + lookupCallClass.getName() + "'.", e));
      }
    }
  }

  /**
   * Model Observer
   */
  @Override
  public void addSmartFieldListener(ContentAssistFieldListener listener) {
    m_listenerList.add(ContentAssistFieldListener.class, listener);
  }

  @Override
  public void removeSmartFieldListener(ContentAssistFieldListener listener) {
    m_listenerList.remove(ContentAssistFieldListener.class, listener);
  }

  @Override
  public boolean isActiveFilterEnabled() {
    return m_activeFilterEnabled;
  }

  @Override
  public void setActiveFilterEnabled(boolean b) {
    m_activeFilterEnabled = b;
  }

  @Override
  public TriState getActiveFilter() {
    return m_activeFilter;
  }

  @Override
  public void setActiveFilter(TriState t) {
    if (isActiveFilterEnabled()) {
      if (t == null) {
        t = TriState.TRUE;
      }
      m_activeFilter = t;
    }
  }

  @Override
  public void setProposalFormHeight(int proposalFormHeight) {
    m_proposalFormHeight = proposalFormHeight;
  }

  @Override
  public int getProposalFormHeight() {
    return m_proposalFormHeight;
  }

  /**
   * @param configuredContentAssistTableClass
   */
  private void setContentAssistTableClass(Class<? extends IContentAssistFieldTable<VALUE>> configuredContentAssistTableClass) {
    m_contentAssistTableClazz = configuredContentAssistTableClass;
  }

  @Override
  public Class<? extends IContentAssistFieldTable<VALUE>> getContentAssistFieldTableClass() {
    return m_contentAssistTableClazz;
  }

  /**
   * see {@link AbstractSmartField#interceptBrowseNew(String)}
   */
  @Override
  public void doBrowseNew(String newText) {
    if (getBrowseNewText() != null) {
      try {
        ILookupRow<LOOKUP_KEY> newRow = interceptBrowseNew(newText);
        if (newRow == null) {
          // nop
        }
        else {
          acceptProposal(newRow);
        }
      }
      catch (Exception e) {
        BEANS.get(ExceptionHandler.class).handle(e);
      }
    }
  }

  @Override
  public String getBrowseIconId() {
    return propertySupport.getPropertyString(PROP_BROWSE_ICON_ID);
  }

  @Override
  public void setBrowseIconId(String s) {
    propertySupport.setPropertyString(PROP_BROWSE_ICON_ID, s);
  }

  @Override
  public String getIconId() {
    return propertySupport.getPropertyString(PROP_ICON_ID);
  }

  @Override
  public void setIconId(String s) {
    propertySupport.setPropertyString(PROP_ICON_ID, s);
  }

  @Override
  public void setMultilineText(boolean b) {
    propertySupport.setPropertyBool(PROP_MULTILINE_TEXT, b);
  }

  @Override
  public boolean isMultilineText() {
    return propertySupport.getPropertyBool(PROP_MULTILINE_TEXT);
  }

  @Override
  public boolean isBrowseAutoExpandAll() {
    return m_browseAutoExpandAll;
  }

  @Override
  public void setBrowseAutoExpandAll(boolean b) {
    m_browseAutoExpandAll = b;
  }

  @Override
  public boolean isBrowseLoadIncremental() {
    return m_loadIncremental;
  }

  @Override
  public void setBrowseLoadIncremental(boolean b) {
    m_loadIncremental = b;
  }

  @Override
  public boolean isBrowseHierarchy() {
    return m_browseHierarchy;
  }

  @Override
  public void setBrowseHierarchy(boolean b) {
    m_browseHierarchy = b;
  }

  @Override
  public int getBrowseMaxRowCount() {
    return m_maxRowCount;
  }

  @Override
  public void setBrowseMaxRowCount(int n) {
    m_maxRowCount = n;
  }

  @Override
  public String getBrowseNewText() {
    return m_browseNewText;
  }

  @Override
  public void setBrowseNewText(String s) {
    m_browseNewText = s;
  }

  @Override
  public Class<? extends ICodeType<?, LOOKUP_KEY>> getCodeTypeClass() {
    return m_codeTypeClass;
  }

  @Override
  public void setCodeTypeClass(Class<? extends ICodeType<?, LOOKUP_KEY>> codeType) {
    m_codeTypeClass = codeType;
    // create lookup service call
    m_lookupCall = null;
    if (m_codeTypeClass != null) {
      m_lookupCall = CodeLookupCall.newInstanceByService(m_codeTypeClass);
      ICodeType t = CODES.getCodeType(m_codeTypeClass);
      if (t != null) {
        if (!ConfigurationUtility.isMethodOverwrite(AbstractContentAssistField.class, "getConfiguredBrowseHierarchy", new Class[0], this.getClass())) {
          setBrowseHierarchy(t.isHierarchy());
        }
      }
    }
  }

  @Override
  public ILookupCall<LOOKUP_KEY> getLookupCall() {
    return m_lookupCall;
  }

  @Override
  public void setLookupCall(ILookupCall<LOOKUP_KEY> call) {
    m_lookupCall = call;
  }

  @Override
  public void setUniquelyDefinedValue(boolean background) throws ProcessingException {
    ILookupCallFetcher<LOOKUP_KEY> fetcher = new ILookupCallFetcher<LOOKUP_KEY>() {
      @Override
      public void dataFetched(List<? extends ILookupRow<LOOKUP_KEY>> rows, ProcessingException failed) {
        if (failed == null) {
          if (rows.size() == 1) {
            acceptProposal(rows.get(0));
          }
        }
      }
    };
    if (background) {
      callBrowseLookupInBackground(IContentAssistField.BROWSE_ALL_TEXT, 2, fetcher);
    }
    else {
      fetcher.dataFetched(callBrowseLookup(IContentAssistField.BROWSE_ALL_TEXT, 2), null);
    }
  }

  @Override
  public IProposalChooserProvider<LOOKUP_KEY> getProposalChooserProvider() {
    return m_proposalChooserProvider;
  }

  @Override
  public void setProposalChooserProvider(IProposalChooserProvider<LOOKUP_KEY> provider) {
    m_proposalChooserProvider = provider;
  }

  public IContentAssistFieldLookupRowFetcher<LOOKUP_KEY> getLookupRowFetcher() {
    return m_lookupRowFetcher;
  }

  public void setLookupRowFetcher(IContentAssistFieldLookupRowFetcher<LOOKUP_KEY> fetcher) {
    m_lookupRowFetcher = fetcher;
  }

  /**
   * Checks if the current context row is still valid. If the current context row is not set, it is considered valid.
   *
   * @param validKey
   *          Valid key
   * @return {@code true} if the current context row is valid, {@code false} otherwise.
   */
  protected boolean isCurrentLookupRowValid(VALUE validKey) {
    if (getCurrentLookupRow() == null) {
      return true;
    }

    return validKey == getCurrentLookupRow().getKey() || (validKey != null && validKey.equals(getCurrentLookupRow().getKey()));
  }

  @Override
  protected final VALUE execValidateValue(VALUE rawValue) throws ProcessingException {
    return rawValue;
  }

  @Override
  public void clearProposal() {
    setCurrentLookupRow(null);
    if (isProposalChooserRegistered()) {
      getProposalChooser().deselect();
    }
  }

  /**
   * Notice: This method is called from a worker originated outside the scout thread (sync into scout model thread)
   */
  protected void installLookupRowContext(ILookupRow<LOOKUP_KEY> row) {
    if (row == null) {
      row = EMPTY_LOOKUP_ROW;
    }
    try {
      m_installingRowContext = true;
      String text = row.getText();
      if (!isMultilineText() && text != null) {
        text = text.replaceAll("[\\n\\r]+", " ");
      }
      setDisplayText(text);
      if (StringUtility.hasText(row.getTooltipText())) {
        setTooltipText(row.getTooltipText());
      }
      else {
        setTooltipText(m_decorationRow.getTooltipText());
      }

      if (StringUtility.hasText(row.getBackgroundColor())) {
        setBackgroundColor(row.getBackgroundColor());
      }
      else {
        setBackgroundColor(m_decorationRow.getBackgroundColor());
      }

      if (StringUtility.hasText(row.getForegroundColor())) {
        setForegroundColor(row.getForegroundColor());
      }
      else {
        setForegroundColor(m_decorationRow.getForegroundColor());
      }

      if (row.getFont() != null) {
        setFont(row.getFont());
      }
      else {
        setFont(m_decorationRow.getFont());
      }
    }
    finally {
      m_installingRowContext = false;
    }
  }

  @Override
  public String getDisplayText() {
    applyLazyStyles();
    return super.getDisplayText();
  }

  @Override
  public String getTooltipText() {
    applyLazyStyles();
    return super.getTooltipText();
  }

  @Override
  public String getBackgroundColor() {
    applyLazyStyles();
    return super.getBackgroundColor();
  }

  @Override
  public String getForegroundColor() {
    applyLazyStyles();
    return super.getForegroundColor();
  }

  @Override
  public FontSpec getFont() {
    applyLazyStyles();
    return super.getFont();
  }

  protected abstract IProposalChooser<?, LOOKUP_KEY> createProposalChooser() throws ProcessingException;

  /**
   * Returns the content assist field's proposal chooser with the use of a {@link IProposalChooserProvider}.
   * <p>
   * To provide a custom proposal chooser create a custom proposal chooser provider and inject it with
   * {@link #createProposalChooserProvider()} or {@link #setProposalChooserProvider()}.
   * </p>
   *
   * @return {@link#IProposalChooser}
   * @throws ProcessingException
   */
  protected IProposalChooser<?, LOOKUP_KEY> createProposalChooser(boolean allowCustomText) throws ProcessingException {
    IProposalChooserProvider<LOOKUP_KEY> proposalChooserProvider = getProposalChooserProvider();
    if (proposalChooserProvider == null) {
      return null;
    }
    return proposalChooserProvider.createProposalChooser(this, allowCustomText);
  }

  protected IProposalChooserProvider<LOOKUP_KEY> createProposalChooserProvider() {
    return new DefaultProposalChooserProvider<LOOKUP_KEY>();
  }

  @Override
  public void doSearch(boolean selectCurrentValue, boolean synchronous) {
    doSearch(getLookupRowFetcher().getLastSearchText(), selectCurrentValue, synchronous);
  }

  @SuppressWarnings("unchecked")
  @Override
  public IProposalChooser<?, LOOKUP_KEY> getProposalChooser() {
    return (IProposalChooser<?, LOOKUP_KEY>) propertySupport.getProperty(PROP_PROPOSAL_CHOOSER);
  }

  protected String toSearchText(String text) {
    return StringUtility.isNullOrEmpty(text) ? IContentAssistField.BROWSE_ALL_TEXT : text;
  }

  @Override
  public void doSearch(String text, boolean selectCurrentValue, boolean synchronous) {
    if (isProposalChooserRegistered()) {
      getProposalChooser().setStatus(new Status(ScoutTexts.get("searchingProposals"), IStatus.WARNING));
    }
    getLookupRowFetcher().update(toSearchText(text), selectCurrentValue, synchronous);
  }

  public void setCurrentLookupRow(ILookupRow<LOOKUP_KEY> row) {
    m_currentLookupRow = row;
  }

  public ILookupRow<LOOKUP_KEY> getCurrentLookupRow() {
    return m_currentLookupRow;
  }

  @Override
  public void prepareKeyLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY key) throws ProcessingException {
    call.setKey(key);
    call.setText(null);
    call.setAll(null);
    call.setRec(null);
    call.setActive(TriState.UNDEFINED);
    //when there is a master value defined in the original call, don't set it to null when no master value is available
    if (getMasterValue() != null || getLookupCall() == null || getLookupCall().getMaster() == null) {
      call.setMaster(getMasterValue());
    }
    interceptPrepareLookup(call);
    interceptPrepareKeyLookup(call, key);
  }

  @Override
  public void prepareTextLookup(ILookupCall<LOOKUP_KEY> call, String text) throws ProcessingException {
    String textPattern = text;
    if (textPattern == null) {
      textPattern = "";
    }
    textPattern = textPattern.toLowerCase();
    IDesktop desktop = ClientSessionProvider.currentSession().getDesktop();
    if (desktop != null && desktop.isAutoPrefixWildcardForTextSearch()) {
      textPattern = "*" + textPattern;
    }
    if (!textPattern.endsWith("*")) {
      textPattern = textPattern + "*";
    }
    call.setKey(null);
    call.setText(textPattern);
    call.setAll(null);
    call.setRec(null);
    call.setActive(isActiveFilterEnabled() ? getActiveFilter() : TriState.TRUE);
    //when there is a master value defined in the original call, don't set it to null when no master value is available
    if (getMasterValue() != null || getLookupCall() == null || getLookupCall().getMaster() == null) {
      call.setMaster(getMasterValue());
    }
    interceptPrepareLookup(call);
    interceptPrepareTextLookup(call, text);
  }

  @Override
  public void prepareBrowseLookup(ILookupCall<LOOKUP_KEY> call, String browseHint, TriState activeState) throws ProcessingException {
    call.setKey(null);
    call.setText(null);
    call.setAll(browseHint);
    call.setRec(null);
    call.setActive(activeState);
    //when there is a master value defined in the original call, don't set it to null when no master value is available
    if (getMasterValue() != null || getLookupCall() == null || getLookupCall().getMaster() == null) {
      call.setMaster(getMasterValue());
    }
    interceptPrepareLookup(call);
    interceptPrepareBrowseLookup(call, browseHint);
  }

  @Override
  public void prepareRecLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY parentKey, TriState activeState) throws ProcessingException {
    call.setKey(null);
    call.setText(null);
    call.setAll(null);
    call.setRec(parentKey);
    //when there is a master value defined in the original call, don't set it to null when no master value is available
    if (getMasterValue() != null || getLookupCall() == null || getLookupCall().getMaster() == null) {
      call.setMaster(getMasterValue());
    }
    call.setActive(activeState);
    interceptPrepareLookup(call);
    interceptPrepareRecLookup(call, parentKey);
  }

  protected abstract VALUE returnLookupRowAsValue(ILookupRow<LOOKUP_KEY> lookupRow);

  /**
   * This method is called when a value is set, but no single match has been found for the given text. Will be
   * implemented differently by SmartField and ProposalField.
   */
  protected abstract VALUE handleMissingLookupRow(String text) throws VetoException;

  /**
   * FIXME AWE: check difference between handleMissingLookupRow and handleAcceptByDisplayText?
   */
  protected abstract boolean handleAcceptByDisplayText(String text);

  @Override
  protected VALUE parseValueInternal(String text) throws ProcessingException {
    ILookupRow<LOOKUP_KEY> currentLookupRow = getCurrentLookupRow();
    if (currentLookupRow == null) {
      return handleMissingLookupRow(text);
    }
    else {
      return returnLookupRowAsValue(getCurrentLookupRow());
    }
  }

  protected void filterKeyLookup(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    interceptFilterLookupResult(call, result);
    interceptFilterKeyLookupResult(call, result);
  }

  private void filterTextLookup(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    interceptFilterLookupResult(call, result);
    interceptFilterTextLookupResult(call, result);
  }

  private void filterBrowseLookup(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    interceptFilterLookupResult(call, result);
    interceptFilterBrowseLookupResult(call, result);
  }

  private void filterRecLookup(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    interceptFilterLookupResult(call, result);
    interceptFilterRecLookupResult(call, result);
  }

  @Override
  public List<? extends ILookupRow<LOOKUP_KEY>> callKeyLookup(LOOKUP_KEY key) throws ProcessingException {
    List<? extends ILookupRow<LOOKUP_KEY>> data = null;
    ILookupCall<LOOKUP_KEY> call = getLookupCall();
    if (call != null) {
      call = BEANS.get(ILookupCallProvisioningService.class).newClonedInstance(call, new FormFieldProvisioningContext(AbstractContentAssistField.this));
      prepareKeyLookup(call, key);
      data = call.getDataByKey();
    }
    List<ILookupRow<LOOKUP_KEY>> result = CollectionUtility.arrayList(data);
    filterKeyLookup(call, result);
    return cleanupResultList(result);
  }

  @Override
  public List<? extends ILookupRow<LOOKUP_KEY>> callTextLookup(String text, int maxRowCount) throws ProcessingException {
    final Holder<List<? extends ILookupRow<LOOKUP_KEY>>> rowsHolder = new Holder<List<? extends ILookupRow<LOOKUP_KEY>>>();
    final Holder<ProcessingException> failedHolder = new Holder<ProcessingException>(ProcessingException.class, new ProcessingException("callback was not invoked"));
    callTextLookupInternal(text, maxRowCount, new ILookupCallFetcher<LOOKUP_KEY>() {
      @Override
      public void dataFetched(List<? extends ILookupRow<LOOKUP_KEY>> rows, ProcessingException failed) {
        rowsHolder.setValue(rows);
        failedHolder.setValue(failed);
      }
    }, false);
    if (failedHolder.getValue() != null) {
      throw failedHolder.getValue();
    }
    else {
      return rowsHolder.getValue();
    }
  }

  @Override
  public IFuture<?> callTextLookupInBackground(String text, int maxRowCount, ILookupCallFetcher<LOOKUP_KEY> fetcher) {
    return callTextLookupInternal(text, maxRowCount, fetcher, true);
  }

  private IFuture<?> callTextLookupInternal(String text, int maxRowCount, final ILookupCallFetcher<LOOKUP_KEY> fetcher, final boolean background) {
    final ILookupCall<LOOKUP_KEY> call = (getLookupCall() != null ? BEANS.get(ILookupCallProvisioningService.class).newClonedInstance(getLookupCall(), new FormFieldProvisioningContext(AbstractContentAssistField.this)) : null);
    ILookupCallFetcher<LOOKUP_KEY> internalFetcher = new ILookupCallFetcher<LOOKUP_KEY>() {
      @Override
      public void dataFetched(final List<? extends ILookupRow<LOOKUP_KEY>> rows, final ProcessingException failed) {
        IRunnable lookupRunnable = new IRunnable() {
          @Override
          public void run() throws Exception {
            if (failed == null) {
              List<ILookupRow<LOOKUP_KEY>> result = new ArrayList<>(rows);
              try {
                filterTextLookup(call, result);
                fetcher.dataFetched(cleanupResultList(result), null);
              }
              catch (ProcessingException e) {
                fetcher.dataFetched(null, e);
              }
            }
            else {
              fetcher.dataFetched(null, failed);
            }
          }
        };

        if (background || !ModelJobs.isModelThread()) {
          ModelJobs.schedule(lookupRunnable, ModelJobs.newInput(ClientRunContexts.copyCurrent()).withName("Smartfield text lookup"));
        }
        else {
          try {
            lookupRunnable.run();
          }
          catch (Exception e) {
            fetcher.dataFetched(null, BEANS.get(ProcessingExceptionTranslator.class).translate(e));
          }
        }
      }
    };
    //
    if (call != null) {
      if (maxRowCount > 0) {
        call.setMaxRowCount(maxRowCount);
      }
      else {
        call.setMaxRowCount(getBrowseMaxRowCount());
      }
      if (background) {
        try {
          prepareTextLookup(call, text);
          return call.getDataByTextInBackground(internalFetcher);
        }
        catch (ProcessingException e1) {
          internalFetcher.dataFetched(null, e1);
        }
      }
      else {
        try {
          prepareTextLookup(call, text);
          internalFetcher.dataFetched(call.getDataByText(), null);
        }
        catch (ProcessingException e) {
          internalFetcher.dataFetched(null, e);
        }
      }
    }
    else {
      internalFetcher.dataFetched(new ArrayList<ILookupRow<LOOKUP_KEY>>(), null);
    }
    return null;
  }

  @Override
  public List<? extends ILookupRow<LOOKUP_KEY>> callBrowseLookup(String browseHint, int maxRowCount) throws ProcessingException {
    return callBrowseLookup(browseHint, maxRowCount, isActiveFilterEnabled() ? getActiveFilter() : TriState.TRUE);
  }

  @Override
  public List<? extends ILookupRow<LOOKUP_KEY>> callBrowseLookup(String browseHint, int maxRowCount, TriState activeState) throws ProcessingException {
    final Holder<List<? extends ILookupRow<LOOKUP_KEY>>> rowsHolder = new Holder<List<? extends ILookupRow<LOOKUP_KEY>>>();
    final Holder<ProcessingException> failedHolder = new Holder<ProcessingException>(ProcessingException.class, new ProcessingException("callback was not invoked"));
    callBrowseLookupInternal(browseHint, maxRowCount, activeState, new ILookupCallFetcher<LOOKUP_KEY>() {
      @Override
      public void dataFetched(List<? extends ILookupRow<LOOKUP_KEY>> rows, ProcessingException failed) {
        rowsHolder.setValue(rows);
        failedHolder.setValue(failed);
      }
    }, false);
    if (failedHolder.getValue() != null) {
      throw failedHolder.getValue();
    }
    else {
      return rowsHolder.getValue();
    }
  }

  @Override
  public IFuture<?> callBrowseLookupInBackground(String browseHint, int maxRowCount, ILookupCallFetcher<LOOKUP_KEY> fetcher) {
    return callBrowseLookupInBackground(browseHint, maxRowCount, isActiveFilterEnabled() ? getActiveFilter() : TriState.TRUE, fetcher);
  }

  @Override
  public IFuture<?> callBrowseLookupInBackground(String browseHint, int maxRowCount, TriState activeState, ILookupCallFetcher<LOOKUP_KEY> fetcher) {
    return callBrowseLookupInternal(browseHint, maxRowCount, activeState, fetcher, true);
  }

  private IFuture<?> callBrowseLookupInternal(String browseHint, int maxRowCount, TriState activeState, final ILookupCallFetcher<LOOKUP_KEY> fetcher, final boolean background) {
    final ILookupCall<LOOKUP_KEY> call = (getLookupCall() != null ? BEANS.get(ILookupCallProvisioningService.class).newClonedInstance(getLookupCall(), new FormFieldProvisioningContext(AbstractContentAssistField.this)) : null);

    ILookupCallFetcher<LOOKUP_KEY> internalFetcher = new ILookupCallFetcher<LOOKUP_KEY>() {
      @Override
      public void dataFetched(final List<? extends ILookupRow<LOOKUP_KEY>> rows, final ProcessingException failed) {

        IRunnable lookupRunnable = new IRunnable() {
          @Override
          public void run() throws Exception {
            if (failed == null) {
              List<ILookupRow<LOOKUP_KEY>> result = new ArrayList<>(rows);
              try {
                filterBrowseLookup(call, result);
                fetcher.dataFetched(cleanupResultList(result), null);
              }
              catch (ProcessingException e) {
                fetcher.dataFetched(null, e);
              }
            }
            else {
              fetcher.dataFetched(null, failed);
            }
          }
        };

        if (background || !ModelJobs.isModelThread()) {
          ModelJobs.schedule(lookupRunnable, ModelJobs.newInput(ClientRunContexts.copyCurrent()).withName("ContentAssistField browse lookup"));
        }
        else {
          try {
            lookupRunnable.run();
          }
          catch (Exception e) {
            fetcher.dataFetched(null, BEANS.get(ProcessingExceptionTranslator.class).translate(e));
          }
        }
      }
    };

    if (call != null) {
      if (maxRowCount > 0) {
        call.setMaxRowCount(maxRowCount);
      }
      else {
        call.setMaxRowCount(getBrowseMaxRowCount());
      }
      if (background) {
        try {
          prepareBrowseLookup(call, browseHint, activeState);
          return call.getDataByAllInBackground(internalFetcher);
        }
        catch (ProcessingException e1) {
          internalFetcher.dataFetched(null, e1);
        }
      }
      else {
        try {
          prepareBrowseLookup(call, browseHint, activeState);
          internalFetcher.dataFetched(call.getDataByAll(), null);
        }
        catch (ProcessingException e) {
          internalFetcher.dataFetched(null, e);
        }
      }
    }
    else {
      internalFetcher.dataFetched(new ArrayList<ILookupRow<LOOKUP_KEY>>(), null);
    }
    return null;
  }

  @Override
  public List<ILookupRow<LOOKUP_KEY>> callSubTreeLookup(LOOKUP_KEY parentKey) throws ProcessingException {
    return callSubTreeLookup(parentKey, isActiveFilterEnabled() ? getActiveFilter() : TriState.TRUE);
  }

  @Override
  public List<ILookupRow<LOOKUP_KEY>> callSubTreeLookup(LOOKUP_KEY parentKey, TriState activeState) throws ProcessingException {
    List<? extends ILookupRow<LOOKUP_KEY>> data = null;
    ILookupCall<LOOKUP_KEY> call = getLookupCall();
    if (call != null) {
      call = BEANS.get(ILookupCallProvisioningService.class).newClonedInstance(call, new FormFieldProvisioningContext(AbstractContentAssistField.this));
      call.setMaxRowCount(getBrowseMaxRowCount());
      prepareRecLookup(call, parentKey, activeState);
      data = call.getDataByRec();
    }
    ArrayList<ILookupRow<LOOKUP_KEY>> result;
    if (data != null) {
      result = new ArrayList<ILookupRow<LOOKUP_KEY>>(data);
    }
    else {
      result = new ArrayList<ILookupRow<LOOKUP_KEY>>(0);
    }
    filterRecLookup(call, result);
    return cleanupResultList(result);
  }

  protected List<ILookupRow<LOOKUP_KEY>> cleanupResultList(List<ILookupRow<LOOKUP_KEY>> list) {
    List<ILookupRow<LOOKUP_KEY>> rows = new ArrayList<ILookupRow<LOOKUP_KEY>>();
    for (ILookupRow<LOOKUP_KEY> r : list) {
      if (r != null) {
        rows.add(r);
      }
    }
    return rows;
  }

  protected void handleProposalChooserClosed() throws ProcessingException {
    ILookupRow<LOOKUP_KEY> row = getProposalChooser().getAcceptedProposal();
    if (row != null) {
      acceptProposal(row);
    }
    else {
      clearProposal(); // FIXME AWE: also set value to null?
    }
  }

  protected abstract void handleFetchResult(IContentAssistFieldDataFetchResult<LOOKUP_KEY> result);

  protected IContentAssistFieldLookupRowFetcher<LOOKUP_KEY> createLookupRowFetcher() {
    if (isBrowseHierarchy()) {
      return new HierachycalContentAssistDataFetcher<LOOKUP_KEY>(this);
    }
    else {
      return new ContentAssistFieldDataFetcher<LOOKUP_KEY>(this);
    }
  }

  /*
   * inner classes
   */

  // end private class

  private class P_LookupRowFetcherPropertyListener implements PropertyChangeListener {
    @SuppressWarnings("unchecked")
    @Override
    public void propertyChange(PropertyChangeEvent evt) {
      if (IContentAssistFieldLookupRowFetcher.PROP_SEARCH_RESULT.equals(evt.getPropertyName())) {
        handleFetchResult((IContentAssistFieldDataFetchResult<LOOKUP_KEY>) evt.getNewValue());
      }
    }
  }

  protected static class LocalContentAssistFieldExtension<VALUE, LOOKUP_KEY, OWNER extends AbstractContentAssistField<VALUE, LOOKUP_KEY>> extends LocalValueFieldExtension<VALUE, OWNER>
      implements IContentAssistFieldExtension<VALUE, LOOKUP_KEY, OWNER> {

    public LocalContentAssistFieldExtension(OWNER owner) {
      super(owner);
    }

    @Override
    public void execFilterBrowseLookupResult(ContentAssistFieldFilterBrowseLookupResultChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
      getOwner().execFilterBrowseLookupResult(call, result);
    }

    @Override
    public ILookupRow<LOOKUP_KEY> execBrowseNew(ContentAssistFieldBrowseNewChain<VALUE, LOOKUP_KEY> chain, String searchText) throws ProcessingException {
      return getOwner().execBrowseNew(searchText);
    }

    @Override
    public void execFilterKeyLookupResult(ContentAssistFieldFilterKeyLookupResultChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
      getOwner().execFilterKeyLookupResult(call, result);
    }

    @Override
    public void execPrepareLookup(ContentAssistFieldPrepareLookupChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call) throws ProcessingException {
      getOwner().execPrepareLookup(call);
    }

    @Override
    public void execPrepareTextLookup(ContentAssistFieldPrepareTextLookupChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, String text) throws ProcessingException {
      getOwner().execPrepareTextLookup(call, text);
    }

    @Override
    public void execPrepareBrowseLookup(ContentAssistFieldPrepareBrowseLookupChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, String browseHint) throws ProcessingException {
      getOwner().execPrepareBrowseLookup(call, browseHint);
    }

    @Override
    public void execFilterTextLookupResult(ContentAssistFieldFilterTextLookupResultChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
      getOwner().execFilterTextLookupResult(call, result);
    }

    @Override
    public void execPrepareRecLookup(ContentAssistFieldPrepareRecLookupChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY parentKey) throws ProcessingException {
      getOwner().execPrepareRecLookup(call, parentKey);
    }

    @Override
    public void execFilterLookupResult(ContentAssistFieldFilterLookupResultChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
      getOwner().execFilterLookupResult(call, result);
    }

    @Override
    public void execFilterRecLookupResult(ContentAssistFieldFilterRecLookupResultChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
      getOwner().execFilterRecLookupResult(call, result);
    }

    @Override
    public void execPrepareKeyLookup(ContentAssistFieldPrepareKeyLookupChain<VALUE, LOOKUP_KEY> chain, ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY key) throws ProcessingException {
      getOwner().execPrepareKeyLookup(call, key);
    }
  }

  @Override
  protected IContentAssistFieldExtension<VALUE, LOOKUP_KEY, ? extends AbstractContentAssistField<VALUE, LOOKUP_KEY>> createLocalExtension() {
    return new LocalContentAssistFieldExtension<VALUE, LOOKUP_KEY, AbstractContentAssistField<VALUE, LOOKUP_KEY>>(this);
  }

  protected final void interceptFilterBrowseLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldFilterBrowseLookupResultChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldFilterBrowseLookupResultChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execFilterBrowseLookupResult(call, result);
  }

  protected final ILookupRow<LOOKUP_KEY> interceptBrowseNew(String searchText) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldBrowseNewChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldBrowseNewChain<VALUE, LOOKUP_KEY>(extensions);
    return chain.execBrowseNew(searchText);
  }

  protected final void interceptFilterKeyLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldFilterKeyLookupResultChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldFilterKeyLookupResultChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execFilterKeyLookupResult(call, result);
  }

  protected final void interceptPrepareLookup(ILookupCall<LOOKUP_KEY> call) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldPrepareLookupChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldPrepareLookupChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execPrepareLookup(call);
  }

  protected final void interceptPrepareTextLookup(ILookupCall<LOOKUP_KEY> call, String text) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldPrepareTextLookupChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldPrepareTextLookupChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execPrepareTextLookup(call, text);
  }

  protected final void interceptPrepareBrowseLookup(ILookupCall<LOOKUP_KEY> call, String browseHint) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldPrepareBrowseLookupChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldPrepareBrowseLookupChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execPrepareBrowseLookup(call, browseHint);
  }

  protected final void interceptFilterTextLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldFilterTextLookupResultChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldFilterTextLookupResultChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execFilterTextLookupResult(call, result);
  }

  protected final void interceptPrepareRecLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY parentKey) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldPrepareRecLookupChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldPrepareRecLookupChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execPrepareRecLookup(call, parentKey);
  }

  protected final void interceptFilterLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldFilterLookupResultChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldFilterLookupResultChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execFilterLookupResult(call, result);
  }

  protected final void interceptFilterRecLookupResult(ILookupCall<LOOKUP_KEY> call, List<ILookupRow<LOOKUP_KEY>> result) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldFilterRecLookupResultChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldFilterRecLookupResultChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execFilterRecLookupResult(call, result);
  }

  protected final void interceptPrepareKeyLookup(ILookupCall<LOOKUP_KEY> call, LOOKUP_KEY key) throws ProcessingException {
    List<? extends IFormFieldExtension<? extends AbstractFormField>> extensions = getAllExtensions();
    ContentAssistFieldPrepareKeyLookupChain<VALUE, LOOKUP_KEY> chain = new ContentAssistFieldPrepareKeyLookupChain<VALUE, LOOKUP_KEY>(extensions);
    chain.execPrepareKeyLookup(call, key);
  }

  protected IProposalChooser<?, LOOKUP_KEY> registerProposalChooserInternal() throws ProcessingException {
    IProposalChooser<?, LOOKUP_KEY> proposalChooser = createProposalChooser();
    propertySupport.setProperty(PROP_PROPOSAL_CHOOSER, proposalChooser);
    return proposalChooser;
  }

  protected boolean isProposalChooserRegistered() {
    return getProposalChooser() != null;
  }

  protected boolean hasAcceptedProposal() {
    IProposalChooser<?, LOOKUP_KEY> proposalChooser = getProposalChooser();
    return proposalChooser != null && proposalChooser.getAcceptedProposal() != null;
  }

  protected void unregisterProposalChooserInternal() {
    if (isProposalChooserRegistered()) {
      getProposalChooser().dispose();
      propertySupport.setProperty(PROP_PROPOSAL_CHOOSER, null);
    }
  }

  @Override
  public void acceptProposal() throws ProcessingException {
    handleProposalChooserClosed();
    unregisterProposalChooserInternal();
  }

  protected boolean isCurrentLookupRowSet() {
    return getCurrentLookupRow() != null;
  }

  protected void setCurrentLookupRowAndValueToNull() {
    setCurrentLookupRow(null);
    setValue(null);
  }

}
