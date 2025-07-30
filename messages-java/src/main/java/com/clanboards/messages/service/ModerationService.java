package com.clanboards.messages.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.moderations.ModerationCreateParams;
import com.openai.models.moderations.ModerationModel;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;
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

  public ModerationService(
      StringRedisTemplate redis, @Value("${openai.api-key:${OPENAI_API_KEY:}}") String apiKey) {
    this.redis = redis;
    if (apiKey != null && !apiKey.isBlank()) {
      this.openai = OpenAIOkHttpClient.builder().apiKey(apiKey).build();
    } else {
      this.openai = null;
    }
  }

  /** Returns BLOCK when the message should be rejected. */
  public ModerationResult verify(String userId, String text) {
    return moderate(userId, text).result();
  }

  /** Performs moderation and returns details including category scores. */
  public ModerationDetails moderate(String userId, String text) {
    boolean blocked = false;
    Map<String, Double> categories = new HashMap<>();
    if (checkSpam(userId, text)) {
      blocked = true;
      categories.put("spam", 1.0);
    }
    if (BAD_WORDS.matcher(text).find()) {
      blocked = true;
      categories.put("explicit", 1.0);
    }
    if (openai != null) {
      ModerationCreateParams req =
          ModerationCreateParams.builder()
              .input(text)
              .model(ModerationModel.OMNI_MODERATION_LATEST)
              .build();
      var resp = openai.moderations().create(req);
      if (!resp.results().isEmpty()) {
        var result = resp.results().get(0);
        if (result.flagged()) {
          blocked = true;
        }
        try {
          // best effort include raw scores as JSON
          var field = result.getClass().getMethod("categoryScores");
          Object scores = field.invoke(result);
          if (scores != null) {
            categories.putAll(new ObjectMapper().convertValue(scores, Map.class));
          }
        } catch (Exception ignored) {
        }
      }
    }
    String json;
    try {
      json = new ObjectMapper().writeValueAsString(categories);
    } catch (JsonProcessingException e) {
      json = "{}";
    }
    return new ModerationDetails(blocked ? ModerationResult.BLOCK : ModerationResult.ALLOW, json);
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
