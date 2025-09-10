package com.clanboards.clashdata.util;

public class TagUtils {

  public static String normalizeTag(String tag) {
    if (tag == null) {
      return null;
    }
    // Strip leading # and convert to uppercase to match Python's normalize_tag behavior
    // Database stores tags without # symbol
    return tag.trim().toUpperCase().replaceFirst("^#", "");
  }
}
