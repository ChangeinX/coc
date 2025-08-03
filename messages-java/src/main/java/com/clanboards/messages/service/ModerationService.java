package com.clanboards.messages.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.moderations.ModerationCreateParams;
import com.openai.models.moderations.ModerationModel;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
  private final String perspectiveKey;
  private final HttpClient http = HttpClient.newHttpClient();
  private static final ObjectMapper mapper = new ObjectMapper();
  private static final Pattern BAD_WORDS =
      Pattern.compile("(?i)(viagra|free money|http[s]?://[^ ]+|fuck|shit|spam)");
  private static final Logger log = LoggerFactory.getLogger(ModerationService.class);
  private static final String WARN_PREFIX = "chat:warn:";

  public ModerationService(
      StringRedisTemplate redis,
      @Value("${openai.api-key:${OPENAI_API_KEY:}}") String apiKey,
      @Value("${perspective.api-key:${PERSPECTIVE_API_KEY:}}") String perspectiveKey) {
    this.redis = redis;
    this.perspectiveKey = perspectiveKey;
    if (apiKey != null && !apiKey.isBlank()) {
      this.openai = OpenAIOkHttpClient.builder().apiKey(apiKey).build();
      log.info("OpenAI client initialized successfully");
    } else {
      this.openai = null;
      log.warn("OpenAI client not initialized - API key is missing or blank");
    }
  }

  /** Perform moderation checks and return the result with category details in JSON form. */
  public ModerationOutcome verify(String userId, String text) {
    var categories = new java.util.LinkedHashMap<String, Double>();
    boolean spam = false;
    boolean profanity = false;
    boolean flagged = false;
    double toxicity = 0.0;

    int spamCount = checkSpam(userId, text);
    if (spamCount > 0) {
      categories.put("spam", 1.0);
      spam = true;
    }
    if (BAD_WORDS.matcher(text).find()) {
      categories.put("profanity", 1.0);
      profanity = true;
    }
    if (openai != null) {
      ModerationCreateParams req =
          ModerationCreateParams.builder()
              .input(text)
              .model(ModerationModel.OMNI_MODERATION_LATEST)
              .build();
      var resp = openai.moderations().create(req);
      String respJson;
      try {
        respJson = mapper.writeValueAsString(resp);
      } catch (JsonProcessingException e) {
        respJson = resp.toString();
      }
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
        toxicity = scores.harassment();
        categories.put("toxicity", toxicity);
        if (result.flagged()) {
          flagged = true;
        }
      }
    }
    if (perspectiveKey != null && !perspectiveKey.isBlank()) {
      try {
        var attrReq = new java.util.LinkedHashMap<String, Object>();
        attrReq.put("TOXICITY", java.util.Map.of());
        attrReq.put("SEVERE_TOXICITY", java.util.Map.of());
        attrReq.put("INSULT", java.util.Map.of());
        attrReq.put("PROFANITY", java.util.Map.of());
        attrReq.put("THREAT", java.util.Map.of());
        attrReq.put("IDENTITY_ATTACK", java.util.Map.of());
        attrReq.put("SEXUALLY_EXPLICIT", java.util.Map.of());
        attrReq.put("FLIRTATION", java.util.Map.of());
        attrReq.put("SPAM", java.util.Map.of());
        var reqMap =
            java.util.Map.of(
                "comment", java.util.Map.of("text", text), "requestedAttributes", attrReq);
        String body = mapper.writeValueAsString(reqMap);
        log.debug("Perspective request for {}: {}", userId, body);
        HttpRequest request =
            HttpRequest.newBuilder()
                .uri(
                    URI.create(
                        "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key="
                            + perspectiveKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        log.info("Calling Perspective API for user: {}", userId);
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        String respBody = response.body();
        log.debug("Perspective response for {}: {}", userId, respBody);
        var node = mapper.readTree(respBody).path("attributeScores");
        java.util.Iterator<java.util.Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>>
            it = node.fields();
        while (it.hasNext()) {
          var e = it.next();
          double score = e.getValue().path("summaryScore").path("value").asDouble(0.0);
          String key = e.getKey().toLowerCase();
          categories.put(key, score);
          log.info("Perspective score {} for {}: {}", key, userId, score);
          if ("profanity".equals(key) && score >= 0.9) {
            profanity = true;
          }
          toxicity = Math.max(toxicity, score);
        }
      } catch (Exception ex) {
        log.warn("Perspective API call failed", ex);
      }
    }
    String json;
    try {
      json = mapper.writeValueAsString(categories);
    } catch (Exception ex) {
      json = "{}";
    }

    double sexualMinors = categories.getOrDefault("sexual_minors", 0.0);
    double extremism = categories.getOrDefault("extremism", 0.0);
    double highest =
        categories.entrySet().stream()
            .filter(e -> !"toxicity".equals(e.getKey()))
            .mapToDouble(java.util.Map.Entry::getValue)
            .max()
            .orElse(0.0);

    ModerationResult result;
    if (sexualMinors >= 0.8 || extremism >= 0.8) {
      result = ModerationResult.BLOCK;
    } else if (highest >= 0.8) {
      result = ModerationResult.MUTE;
    } else if (spamCount >= 3) {
      result = ModerationResult.MUTE;
    } else if (spam) {
      result = ModerationResult.READONLY;
    } else if (toxicity >= 0.7 && toxicity < 0.8) {
      result = ModerationResult.WARNING;
    } else {
      result = ModerationResult.ALLOW;
    }
    log.info("Moderation outcome for {}: {} {}", userId, result, json);
    return new ModerationOutcome(result, categories);
  }

  /**
   * Detects spam by tracking send delays, repeated message hashes, and message rate in Redis.
   * Returns the number of recent spam detections for the user (0 when none).
   */
  private int checkSpam(String userId, String text) {
    String delayKey = "chat:delay:" + userId;
    String nextKey = "chat:next:" + userId;
    String hashKey = "chat:hash:" + userId;
    String countKey = "chat:spamcount:" + userId;
    String rateKey = "chat:rate:" + userId;
    long now = Instant.now().getEpochSecond();
    long next = parse(redis.opsForValue().get(nextKey));
    long delay = parse(redis.opsForValue().get(delayKey));
    if (delay == 0) delay = 1;

    // Track overall message rate using a sliding 60s window
    long nowMs = now * 1000;
    long windowStart = nowMs - 60_000;
    var zset = redis.opsForZSet();
    zset.removeRangeByScore(rateKey, 0, windowStart);
    zset.add(rateKey, Long.toString(nowMs), nowMs);
    Long rate = zset.size(rateKey);
    redis.expire(rateKey, Duration.ofMinutes(2));

    String hash = hash(text);
    String lastHash = redis.opsForValue().get(hashKey);
    boolean violation = (rate != null && rate > 20);

    if (hash.equals(lastHash) || now < next) {
      violation = true;
    }

    if (violation) {
      delay = Math.min(delay * 2, 60);
      redis.opsForValue().set(delayKey, Long.toString(delay), Duration.ofMinutes(10));
      redis
          .opsForValue()
          .set(nextKey, Long.toString(Math.max(now, next) + delay), Duration.ofMinutes(10));
      redis.opsForValue().set(hashKey, hash, Duration.ofMinutes(10));
      Long strikes = redis.opsForValue().increment(countKey);
      if (strikes != null && strikes == 1L) {
        redis.expire(countKey, Duration.ofMinutes(10));
      }
      return strikes != null ? strikes.intValue() : 1;
    }

    redis
        .opsForValue()
        .set(delayKey, Long.toString(Math.max(1, delay / 2)), Duration.ofMinutes(10));
    redis.opsForValue().set(nextKey, Long.toString(now + delay), Duration.ofMinutes(10));
    redis.opsForValue().set(hashKey, hash, Duration.ofMinutes(10));
    redis.delete(countKey);
    return 0;
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

  /** Return true when a recent warning exists for the user. */
  public boolean hasWarning(String userId) {
    return Boolean.TRUE.equals(redis.hasKey(WARN_PREFIX + userId));
  }

  /** Record a warning for the user with a one hour expiry. */
  public void markWarning(String userId) {
    redis.opsForValue().set(WARN_PREFIX + userId, "1", Duration.ofHours(1));
  }
}
