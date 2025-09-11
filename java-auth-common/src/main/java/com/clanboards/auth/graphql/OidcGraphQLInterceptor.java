package com.clanboards.auth.graphql;

import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.auth.service.OidcTokenValidator.TokenValidationException;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class OidcGraphQLInterceptor implements WebGraphQlInterceptor {
  private static final Logger logger = LoggerFactory.getLogger(OidcGraphQLInterceptor.class);

  private final OidcTokenValidator tokenValidator;

  public OidcGraphQLInterceptor(OidcTokenValidator tokenValidator) {
    this.tokenValidator = tokenValidator;
  }

  @Override
  public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
    String token = extractToken(request);

    if (token != null) {
      try {
        Claims claims = tokenValidator.validateToken(token);
        Long userId = tokenValidator.extractUserId(claims);

        if (userId != null) {
          // Add authentication context to GraphQL execution
          request.configureExecutionInput(
              (ei, builder) ->
                  builder
                      .graphQLContext(
                          ctx -> {
                            ctx.put("userId", String.valueOf(userId));
                            ctx.put("authenticated", true);

                            // Add optional request metadata
                            String ip = request.getHeaders().getFirst("X-Forwarded-For");
                            String ua = request.getHeaders().getFirst("User-Agent");
                            if (ip != null) ctx.put("ip", ip);
                            if (ua != null) ctx.put("ua", ua);
                          })
                      .build());

          logger.debug("GraphQL request authenticated for userId: {}", userId);
        } else {
          logger.debug("Valid token but could not extract userId");
        }
      } catch (TokenValidationException e) {
        logger.debug("Invalid token in GraphQL request: {}", e.getMessage());
      }
    }

    return chain.next(request);
  }

  private String extractToken(WebGraphQlRequest request) {
    // Try Authorization header first
    String auth = request.getHeaders().getFirst("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      return auth.substring(7);
    }

    // Fallback to cookie-based session
    String cookie = request.getHeaders().getFirst("Cookie");
    if (cookie != null) {
      for (String part : cookie.split(";")) {
        String trimmed = part.trim();
        if (trimmed.startsWith("sid=")) {
          return trimmed.substring(4);
        }
      }
    }

    return null;
  }
}
