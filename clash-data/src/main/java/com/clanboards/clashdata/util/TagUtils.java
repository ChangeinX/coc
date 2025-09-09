package com.clanboards.clashdata.util;

public class TagUtils {

  public static String normalizeTag(String tag) {
    if (tag == null) {
      return null;
    }
    String normalized = tag.trim().toUpperCase();
    if (!normalized.startsWith("#")) {
      normalized = "#" + normalized;
    }
    return normalized;
  }
}
