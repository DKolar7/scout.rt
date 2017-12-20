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
package org.eclipse.scout.rt.client.ui.form.fields.smartfield;

import java.beans.PropertyChangeListener;

import org.eclipse.scout.rt.client.services.lookup.ILookupCallResult;
import org.eclipse.scout.rt.client.services.lookup.IQueryParam;

public interface ISmartFieldLookupRowFetcher<LOOKUP_KEY> {

  String PROP_SEARCH_RESULT = "searchResult";

  void addPropertyChangeListener(PropertyChangeListener listener);

  void removePropertyChangeListener(PropertyChangeListener listener);

  void update(IQueryParam<LOOKUP_KEY> queryParam, boolean synchronous);

  ILookupCallResult<LOOKUP_KEY> getResult();

}
