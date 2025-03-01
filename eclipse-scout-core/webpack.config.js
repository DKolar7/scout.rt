/*
 * Copyright (c) 2014-2019 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */

const baseConfig = require('@eclipse-scout/cli/scripts/webpack-defaults');
module.exports = (env, args) => {
  args.resDirArray = ['res'];
  const config = baseConfig(env, args);

  // This build creates resources that can directly be included in a html file without needing a build stack (webpack, babel etc.).
  // The resources are available by a CDN that provides npm modules (e.g. https://www.jsdelivr.com/package/npm/@eclipse-scout/core)
  config.entry = {
    'eclipse-scout-core': './src/index.js',
    'eclipse-scout-core-theme': './src/index.less',
    'eclipse-scout-core-theme-dark': './src/index-dark.less'
  };
  config.externals = {
    // Dependencies should not be included in the resulting js file.
    // The consumer has to include them by himself which gives him more control (maybe his site has already added jQuery or he wants to use another version)
    // Left side is the import name, right side the name of the global variable added by the plugin (e.g. window.jQuery)
    'jquery': 'jQuery',
    'sourcemapped-stacktrace': 'sourceMappedStackTrace'
  };
  config.optimization.splitChunks = undefined; // disable splitting

  return config;
};
