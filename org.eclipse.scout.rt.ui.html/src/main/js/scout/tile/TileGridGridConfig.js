/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
scout.TileGridGridConfig = function() {
  scout.TileGridGridConfig.parent.call(this);
};
scout.inherits(scout.TileGridGridConfig, scout.LogicalGridConfig);

scout.TileGridGridConfig.prototype.getGridWidgets = function() {
  return this.widget.filteredTiles;
};
