package com.clanboards.messages.config;

import com.clanboards.messages.model.Session;
import com.clanboards.messages.repository.SessionRepository;
import com.clanboards.messages.service.JwksService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class AuthInterceptor implements WebGraphQlInterceptor {
  private final SessionRepository sessions;
  private final SecretKey key;
  private final JwksService jwksService;
  private static final Logger logger = LoggerFactory.getLogger(AuthInterceptor.class);

  public AuthInterceptor(
      SessionRepository sessions,
      @Value("${jwt.signing-key:change-me}") String signingKey,
      JwksService jwksService) {
    this.sessions = sessions;
    this.key = Keys.hmacShaKeyFor(signingKey.getBytes(StandardCharsets.UTF_8));
    this.jwksService = jwksService;
  }

  @Override
  public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
    String token = null;
    String auth = request.getHeaders().getFirst("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      token = auth.substring(7);
    } else {
      String cookie = request.getHeaders().getFirst("Cookie");
      if (cookie != null) {
        for (String part : cookie.split(";")) {
          String trimmed = part.trim();
          if (trimmed.startsWith("sid=")) {
            token = trimmed.substring(4);
            break;
          }
        }
      }
    }
    if (token != null) {
      try {
        Claims claims = parseJwt(token);
        Long sessionId = ((Number) claims.get("sid")).longValue();
        if (sessionId != null) {
          Session sess = sessions.findById(sessionId).orElse(null);
          if (sess != null && sess.getExpiresAt().isAfter(Instant.now())) {
            String ip = request.getHeaders().getFirst("X-Forwarded-For");
            String ua = request.getHeaders().getFirst("User-Agent");
            request.configureExecutionInput(
                (ei, builder) ->
                    builder
                        .graphQLContext(
                            ctx -> {
                              ctx.put("userId", String.valueOf(sess.getUserId()));
                              if (ip != null) ctx.put("ip", ip);
                              if (ua != null) ctx.put("ua", ua);
                            })
                        .build());
          }
        }
      } catch (Exception e) {
        logger.warn("Invalid session token", e);
      }
    }
    return chain.next(request);
  }

  private Claims parseJwt(String token) throws Exception {
    // First try RSA verification via JWKS (new tokens from user_service)
    try {
      return jwksService.parseAndValidateJwt(token);
    } catch (Exception rsaError) {
      logger.debug("RSA JWT parsing failed, trying HMAC fallback", rsaError);

      // Fallback to HMAC verification for legacy tokens
      try {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
      } catch (Exception hmacError) {
        logger.debug("HMAC JWT parsing also failed", hmacError);
        throw new RuntimeException("JWT parsing failed with both RSA and HMAC methods", hmacError);
      }
    }
  }
}
