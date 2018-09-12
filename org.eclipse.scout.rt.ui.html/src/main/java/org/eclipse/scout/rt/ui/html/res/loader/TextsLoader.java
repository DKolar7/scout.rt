/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.html.res.loader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.TreeMap;

import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.config.CONFIG;
import org.eclipse.scout.rt.platform.nls.NlsResourceBundle;
import org.eclipse.scout.rt.platform.resource.BinaryResource;
import org.eclipse.scout.rt.platform.resource.BinaryResources;
import org.eclipse.scout.rt.platform.text.AbstractDynamicNlsTextProviderService;
import org.eclipse.scout.rt.platform.util.FileUtility;
import org.eclipse.scout.rt.ui.html.UiHtmlConfigProperties.UiLocalesProperty;
import org.json.JSONObject;

public class TextsLoader extends AbstractResourceLoader {
  private final Map<String, Map<String, String>> m_textsByLanguageTag = new LinkedHashMap<>();

  @Override
  public BinaryResource loadResource(String pathInfo) throws IOException {
    List<String> languageTags = getLanguageTags();
    JSONObject jsonTexts = new JSONObject();

    // Gather all texts and group them by language tags
    for (AbstractDynamicNlsTextProviderService textService : BEANS.all(AbstractDynamicNlsTextProviderService.class)) {
      for (String tag : languageTags) {
        NlsResourceBundle bundle = getResourceBundle(textService, tag);
        if (bundle == null) {
          continue;
        }

        Map<String, String> map = m_textsByLanguageTag.computeIfAbsent(tag, k -> new TreeMap<>());
        putTextsFromBundle(bundle, map);
      }
    }

    // Convert the texts into json
    for (Entry<String, Map<String, String>> entry : m_textsByLanguageTag.entrySet()) {
      String languageTag = entry.getKey();
      JSONObject jsonTextMap = textsToJson(languageTag, entry.getValue());
      if (languageTag == null) {
        languageTag = "default";
      }
      jsonTexts.put(languageTag, jsonTextMap);
    }

    // Create a binary resource
    byte[] content = jsonTexts.toString(2).getBytes(StandardCharsets.UTF_8);
    return BinaryResources.create()
        .withFilename("texts.json")
        .withCharset(StandardCharsets.UTF_8)
        .withContentType(FileUtility.getContentTypeForExtension("json"))
        .withContent(content)
        .withCachingAllowed(true)
        .build();
  }

  protected Map<String, String> putTextsFromBundle(ResourceBundle bundle, Map<String, String> textMap) {
    for (Enumeration<String> en = bundle.getKeys(); en.hasMoreElements();) {
      String key = en.nextElement();
      String text = bundle.getString(key);
      if (!textMap.containsKey(key)) {
        textMap.put(key, text);
      }
    }
    return textMap;
  }

  protected JSONObject textsToJson(String languageTag, Map<String, String> textMap) {
    JSONObject texts = new JSONObject();
    for (Entry<String, String> entry : textMap.entrySet()) {
      texts.put(entry.getKey(), entry.getValue());
    }
    return texts;
  }

  protected List<String> getLanguageTags() {
    List<String> languageTags = CONFIG.getPropertyValue(UiLocalesProperty.class);
    return processLanguageTags(languageTags);
  }

  /**
   * Processes the given language tags and does two things:
   * <ul>
   * <li>Adds a null value at the beginning representing the default locale</li>
   * <li>Makes sure the language itself without locale is always added.</li>
   * </ul>
   * Always adding the language is necessary, because if the texts for de-CH should be loaded, the texts for de need to
   * be loaded as well. Because texts for de-CH only contain the exceptions to de.<br>
   * You may now say "this should be configured properly". But: the configuration property is used to load the locales
   * as well, and to eventually display the available locales to the user. This gives the possibility to only display a
   * subset of Locales (like English, Deutsch (Schweiz)), instead of (English, Deutsch, Deutsch (Schweiz)).
   *
   * @return a new list of language tags including the missing tags in the same order as the original one
   */
  protected List<String> processLanguageTags(List<String> languageTags) {
    // Group by language and add language itself (e.g [en,de-CH] will be converted to en: [en], de: [de,de-CH]
    Map<String, Set<String>> languages = new LinkedHashMap<>();
    for (String tag : languageTags) {
      Locale locale = Locale.forLanguageTag(tag);
      Set<String> tagsForLanguage = languages.get(locale.getLanguage());
      if (tagsForLanguage == null) {
        tagsForLanguage = new LinkedHashSet<>();
        languages.put(locale.getLanguage(), tagsForLanguage);

        // Always add language itself, without any country
        tagsForLanguage.add(locale.getLanguage());
      }
      tagsForLanguage.add(tag);
    }

    // Create a new list including the missing language tags
    languageTags = new ArrayList<>();
    for (Set<String> tags : languages.values()) {
      languageTags.addAll(tags);
    }

    // add default language
    languageTags.add(0, null);
    return languageTags;
  }

  protected static NlsResourceBundle getResourceBundle(AbstractDynamicNlsTextProviderService textService, String languageTag) throws IOException {
    String suffix = "";
    if (languageTag != null) {
      // The text property files work with '_' instead of '-' -> convert them.
      suffix = "_" + languageTag.replace("-", "_");
    }
    return NlsResourceBundle.getBundle(textService.getDynamicNlsBaseName(), suffix, textService.getClass().getClassLoader());
  }

}
