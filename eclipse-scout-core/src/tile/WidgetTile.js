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
import {scout, Tile, Widget} from '../index';

/**
 * A tile containing a widget. The widget will be rendered and its $container used as $container for the tile.
 * If the widget has gridDataHints, they will be used as gridDataHints for the tile.
 */
export default class WidgetTile extends Tile {

  constructor() {
    super();
    // The referenced widget which will be rendered (it is not possible to just call it 'widget' due to the naming conflict with the widget function)
    this.tileWidget = null;
    this._addWidgetProperties(['tileWidget']);
    this._widgetPropertyChangeHandler = this._onWidgetPropertyChange.bind(this);
  }

  _init(model) {
    super._init(model);
    scout.assertProperty(this, 'tileWidget', Widget);
    // Hide tile if tileWidget is made invisible (don't do it if visible is true to not accidentally override the visibility state)
    if (!this.tileWidget.visible) {
      this.setVisible(false);
    }
    if (!this.tileWidget.enabled) {
      this.setEnabled(false);
    }
    this.tileWidget.on('propertyChange', this._widgetPropertyChangeHandler);
  }

  _destroy() {
    this.tileWidget.off('propertyChange', this._widgetPropertyChangeHandler);
    super._destroy();
  }

  _render() {
    this.tileWidget.render(this.$parent);
    this.$container = this.tileWidget.$container;
    this.htmlComp = this.tileWidget.htmlComp;
  }

  _onWidgetPropertyChange(event) {
    if (event.propertyName === 'visible') {
      this.setVisible(event.newValue);
    } else if (event.propertyName === 'enabled') {
      this.setEnabled(event.newValue);
    }
  }
}
