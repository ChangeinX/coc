package com.clanboards.clashdata.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TagUtilsTest {

  @Test
  void testNormalizeTag_AlreadyNormalized() {
    String result = TagUtils.normalizeTag("#ABC123");
    assertThat(result).isEqualTo("#ABC123");
  }

  @Test
  void testNormalizeTag_MissingHash() {
    String result = TagUtils.normalizeTag("ABC123");
    assertThat(result).isEqualTo("#ABC123");
  }

  @Test
  void testNormalizeTag_Lowercase() {
    String result = TagUtils.normalizeTag("#abc123");
    assertThat(result).isEqualTo("#ABC123");
  }

  @Test
  void testNormalizeTag_LowercaseNoHash() {
    String result = TagUtils.normalizeTag("abc123");
    assertThat(result).isEqualTo("#ABC123");
  }

  @Test
  void testNormalizeTag_WithSpaces() {
    String result = TagUtils.normalizeTag("  #abc123  ");
    assertThat(result).isEqualTo("#ABC123");
  }

  @Test
  void testNormalizeTag_Null() {
    String result = TagUtils.normalizeTag(null);
    assertThat(result).isNull();
  }
}
