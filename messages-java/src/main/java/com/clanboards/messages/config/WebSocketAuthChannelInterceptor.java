package com.clanboards.messages.config;

import com.clanboards.auth.service.OidcTokenValidator;
import io.jsonwebtoken.Claims;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {
  private static final Logger logger =
      LoggerFactory.getLogger(WebSocketAuthChannelInterceptor.class);

  private final OidcTokenValidator tokenValidator;

  public WebSocketAuthChannelInterceptor(OidcTokenValidator tokenValidator) {
    this.tokenValidator = tokenValidator;
  }

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor =
        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

    if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
      // Authenticate on CONNECT
      String token = extractToken(accessor);
      if (token != null) {
        try {
          Claims claims = tokenValidator.validateToken(token);
          Long userId = tokenValidator.extractUserId(claims);

          if (userId != null) {
            // Store user information in session attributes
            accessor.getSessionAttributes().put("userId", String.valueOf(userId));
            accessor.getSessionAttributes().put("authenticated", true);
            logger.debug("WebSocket authenticated for userId: {}", userId);
          } else {
            logger.debug("Valid token but could not extract userId");
            throw new RuntimeException("Authentication failed - invalid user");
          }
        } catch (Exception e) {
          logger.debug("WebSocket authentication failed: {}", e.getMessage());
          throw new RuntimeException("Authentication failed - invalid token");
        }
      } else {
        // No token provided - reject connection for now
        // You might want to allow anonymous connections to public channels
        logger.debug("WebSocket connection rejected - no authentication token");
        throw new RuntimeException("Authentication required");
      }
    } else if (accessor != null && accessor.getSessionAttributes() != null) {
      // For subsequent messages, check if user is authenticated
      Boolean authenticated = (Boolean) accessor.getSessionAttributes().get("authenticated");
      if (authenticated == null || !authenticated) {
        logger.debug("WebSocket message rejected - user not authenticated");
        throw new RuntimeException("Authentication required");
      }
    }

    return message;
  }

  private String extractToken(StompHeaderAccessor accessor) {
    // Try Authorization header first (native headers)
    List<String> authHeaders = accessor.getNativeHeader("Authorization");
    if (authHeaders != null && !authHeaders.isEmpty()) {
      String auth = authHeaders.get(0);
      if (auth != null && auth.startsWith("Bearer ")) {
        return auth.substring(7);
      }
    }

    // Try cookie-based session (for browser clients)
    List<String> cookieHeaders = accessor.getNativeHeader("Cookie");
    if (cookieHeaders != null && !cookieHeaders.isEmpty()) {
      String cookie = cookieHeaders.get(0);
      if (cookie != null) {
        for (String part : cookie.split(";")) {
          String trimmed = part.trim();
          if (trimmed.startsWith("sid=")) {
            return trimmed.substring(4);
          }
        }
      }
    }

    // Try token parameter (for clients that can't send headers)
    List<String> tokenParams = accessor.getNativeHeader("token");
    if (tokenParams != null && !tokenParams.isEmpty()) {
      return tokenParams.get(0);
    }

    return null;
  }
}
