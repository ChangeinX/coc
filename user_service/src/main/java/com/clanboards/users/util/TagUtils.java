package com.clanboards.users.util;

public class TagUtils {
  /**
   * Internal canonical form: upper-case, no leading #. This matches the normalize_tag function from
   * Python coclib.
   */
  public static String normalizeTag(String tag) {
    if (tag == null) {
      return null;
    }
    return tag.toUpperCase().replaceFirst("^#+", "");
  }
}
