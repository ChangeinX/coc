package com.clanboards.messages.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Base64;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class AuthInterceptor implements WebGraphQlInterceptor {
  private static final ObjectMapper mapper = new ObjectMapper();

  @Override
  public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
    String auth = request.getHeaders().getFirst("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
      String[] parts = token.split("\\.");
      if (parts.length > 1) {
        try {
          String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
          JsonNode node = mapper.readTree(payload);
          String sub = node.has("sub") ? node.get("sub").asText() : null;
          if (sub != null) {
            request.configureExecutionInput(
                (ei, builder) -> builder.graphQLContext(ctx -> ctx.put("userId", sub)).build());
          }
        } catch (Exception ignored) {
        }
      }
    }
    return chain.next(request);
  }
}
