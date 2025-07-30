package com.clanboards.messages.service;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.moderations.ModerationCreateParams;
import com.openai.models.moderations.ModerationModel;
import java.time.Duration;
import java.time.Instant;
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
      Pattern.compile("(?i)(?:spam|viagra|free money|badword)");

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
    if (checkSpam(userId)) {
      return ModerationResult.BLOCK;
    }
    if (BAD_WORDS.matcher(text).find()) {
      return ModerationResult.BLOCK;
    }
    if (openai != null) {
      ModerationCreateParams req =
          ModerationCreateParams.builder()
              .input(text)
              .model(ModerationModel.OMNI_MODERATION_LATEST)
              .build();
      var resp = openai.moderations().create(req);
      if (!resp.results().isEmpty() && resp.results().get(0).flagged()) {
        return ModerationResult.BLOCK;
      }
    }
    return ModerationResult.ALLOW;
  }

  private boolean checkSpam(String userId) {
    String delayKey = "chat:delay:" + userId;
    String nextKey = "chat:next:" + userId;
    long now = Instant.now().getEpochSecond();
    long next = parse(redis.opsForValue().get(nextKey));
    long delay = parse(redis.opsForValue().get(delayKey));
    if (delay == 0) delay = 1;
    if (now < next) {
      delay = Math.min(delay * 2, 60);
      redis.opsForValue().set(delayKey, Long.toString(delay), Duration.ofMinutes(10));
      redis.opsForValue().set(nextKey, Long.toString(next + delay), Duration.ofMinutes(10));
      return true;
    }
    redis
        .opsForValue()
        .set(delayKey, Long.toString(Math.max(1, delay / 2)), Duration.ofMinutes(10));
    redis.opsForValue().set(nextKey, Long.toString(now + delay), Duration.ofMinutes(10));
    return false;
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
