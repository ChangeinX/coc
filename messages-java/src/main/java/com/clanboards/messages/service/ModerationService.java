package com.clanboards.messages.service;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.moderations.ModerationCreateParams;
import com.openai.models.moderations.ModerationModel;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Simple moderation layer using regex, Redis-backed spam detection and OpenAI moderation API.
 * Leaves room for a second layer like Perspective.
 */
@Service
public class ModerationService {
  private final StringRedisTemplate redis;
  private final OpenAIClient openai;
  private static final Pattern BAD_WORDS =
      Pattern.compile("(?i)(viagra|free money|http[s]?://[^ ]+|fuck|shit|spam)");
  private static final Logger log = LoggerFactory.getLogger(ModerationService.class);

  public ModerationService(
      StringRedisTemplate redis, @Value("${openai.api-key:${OPENAI_API_KEY:}}") String apiKey) {
    this.redis = redis;
    if (apiKey != null && !apiKey.isBlank()) {
      this.openai = OpenAIOkHttpClient.builder().apiKey(apiKey).build();
    } else {
      this.openai = null;
    }
  }

  /** Perform moderation checks and return the result with category details in JSON form. */
  public ModerationOutcome verify(String userId, String text) {
    boolean block = false;
    var categories = new java.util.LinkedHashMap<String, Double>();
    if (checkSpam(userId, text)) {
      categories.put("spam", 1.0);
      block = true;
    }
    if (BAD_WORDS.matcher(text).find()) {
      categories.put("profanity", 1.0);
      block = true;
    }
    if (openai != null) {
      ModerationCreateParams req =
          ModerationCreateParams.builder()
              .input(text)
              .model(ModerationModel.OMNI_MODERATION_LATEST)
              .build();
      var resp = openai.moderations().create(req);
      log.debug("OpenAI moderation response for {}: {}", userId, resp);
      if (!resp.results().isEmpty()) {
        var result = resp.results().get(0);
        var scores = result.categoryScores();
        categories.put("harassment", scores.harassment());
        categories.put("harassment_threatening", scores.harassmentThreatening());
        categories.put("hate", scores.hate());
        categories.put("hate_threatening", scores.hateThreatening());
        categories.put("illicit", scores.illicit());
        categories.put("illicit_violent", scores.illicitViolent());
        categories.put("self_harm", scores.selfHarm());
        categories.put("self_harm_instructions", scores.selfHarmInstructions());
        categories.put("self_harm_intent", scores.selfHarmIntent());
        categories.put("sexual", scores.sexual());
        categories.put("sexual_minors", scores.sexualMinors());
        categories.put("violence", scores.violence());
        categories.put("violence_graphic", scores.violenceGraphic());
        if (result.flagged()) {
          block = true;
        }
      }
    }
    String json;
    try {
      json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(categories);
    } catch (Exception ex) {
      json = "{}";
    }
    ModerationResult result = block ? ModerationResult.BLOCK : ModerationResult.ALLOW;
    log.info("Moderation outcome for {}: {} {}", userId, result, json);
    return new ModerationOutcome(result, json);
  }

  /**
   * Detects spam by tracking send delays and repeated message hashes in Redis. Returns true when
   * the sender should be rate limited.
   */
  private boolean checkSpam(String userId, String text) {
    String delayKey = "chat:delay:" + userId;
    String nextKey = "chat:next:" + userId;
    String hashKey = "chat:hash:" + userId;
    long now = Instant.now().getEpochSecond();
    long next = parse(redis.opsForValue().get(nextKey));
    long delay = parse(redis.opsForValue().get(delayKey));
    if (delay == 0) delay = 1;

    String hash = hash(text);
    String lastHash = redis.opsForValue().get(hashKey);

    if (hash.equals(lastHash) || now < next) {
      delay = Math.min(delay * 2, 60);
      redis.opsForValue().set(delayKey, Long.toString(delay), Duration.ofMinutes(10));
      redis
          .opsForValue()
          .set(nextKey, Long.toString(Math.max(now, next) + delay), Duration.ofMinutes(10));
      redis.opsForValue().set(hashKey, hash, Duration.ofMinutes(10));
      return true;
    }

    redis
        .opsForValue()
        .set(delayKey, Long.toString(Math.max(1, delay / 2)), Duration.ofMinutes(10));
    redis.opsForValue().set(nextKey, Long.toString(now + delay), Duration.ofMinutes(10));
    redis.opsForValue().set(hashKey, hash, Duration.ofMinutes(10));
    return false;
  }

  private String hash(String text) {
    try {
      MessageDigest md = MessageDigest.getInstance("MD5");
      byte[] bytes = md.digest(text.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(bytes.length * 2);
      for (byte b : bytes) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();
    } catch (NoSuchAlgorithmException e) {
      return Integer.toHexString(text.hashCode());
    }
  }

  private long parse(String v) {
    if (v == null) {
      return 0;
    }
    try {
      return Long.parseLong(v);
    } catch (NumberFormatException ex) {
      return 0;
    }
  }
}
