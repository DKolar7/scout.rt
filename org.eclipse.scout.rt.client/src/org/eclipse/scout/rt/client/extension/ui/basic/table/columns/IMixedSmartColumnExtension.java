package org.eclipse.scout.rt.client.extension.ui.basic.table.columns;

import org.eclipse.scout.rt.client.extension.ui.basic.table.columns.MixedSmartColumnChains.MixedSmartColumnConvertKeyToValueChain;
import org.eclipse.scout.rt.client.ui.basic.table.columns.AbstractMixedSmartColumn;

public interface IMixedSmartColumnExtension<VALUE_TYPE, LOOKUP_CALL_KEY_TYPE, OWNER extends AbstractMixedSmartColumn<VALUE_TYPE, LOOKUP_CALL_KEY_TYPE>> extends IContentAssistColumnExtension<VALUE_TYPE, LOOKUP_CALL_KEY_TYPE, OWNER> {

  VALUE_TYPE execConvertKeyToValue(MixedSmartColumnConvertKeyToValueChain<VALUE_TYPE, LOOKUP_CALL_KEY_TYPE> chain, LOOKUP_CALL_KEY_TYPE key);
}
