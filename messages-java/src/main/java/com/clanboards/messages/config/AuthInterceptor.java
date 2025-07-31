package com.clanboards.messages.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class AuthInterceptor implements WebGraphQlInterceptor {
  private final byte[] key;

  public AuthInterceptor(@Value("${jwt.signing-key:change-me}") String key) {
    this.key = key.getBytes(StandardCharsets.UTF_8);
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
        Claims claims =
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(key))
                .build()
                .parseClaimsJws(token)
                .getBody();
        String sub = claims.get("sub", String.class);
        if (sub != null) {
          String ip = request.getHeaders().getFirst("X-Forwarded-For");
          String ua = request.getHeaders().getFirst("User-Agent");
          request.configureExecutionInput(
              (ei, builder) ->
                  builder
                      .graphQLContext(
                          ctx -> {
                            ctx.put("userId", sub);
                            if (ip != null) ctx.put("ip", ip);
                            if (ua != null) ctx.put("ua", ua);
                          })
                      .build());
        }
      } catch (Exception ignored) {
      }
    }
    return chain.next(request);
  }
}
