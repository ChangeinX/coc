package com.clanboards.users.controller;

import com.clanboards.users.exception.UnauthorizedException;
import com.clanboards.users.exception.ValidationException;
import com.clanboards.users.model.Session;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.SessionRepository;
import com.clanboards.users.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
  private final SessionRepository sessions;
  private final UserRepository users;
  private final SecretKey key;
  private final long maxAge;
  private final String cookieDomain;
  private final boolean cookieSecure;
  private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

  public AuthController(
      SessionRepository sessions,
      UserRepository users,
      @Value("${jwt.signing-key:secret}") String signingKey,
      @Value("${session.max-age:604800}") long maxAge,
      @Value("${cookie.domain:}") String cookieDomain,
      @Value("${cookie.secure:true}") boolean cookieSecure) {
    this.sessions = sessions;
    this.users = users;
    this.key = Keys.hmacShaKeyFor(signingKey.getBytes(StandardCharsets.UTF_8));
    this.maxAge = maxAge;
    this.cookieDomain = cookieDomain;
    this.cookieSecure = cookieSecure;
  }

  public record LoginPayload(String idToken) {}

  private Map<String, Object> decode(String token) throws Exception {
    String[] parts = token.split("\\.");
    if (parts.length < 2) return Map.of();
    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
    return new com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map.class);
  }

  @PostMapping("/auth/session")
  public ResponseEntity<Map<String, String>> login(
      @RequestBody LoginPayload payload,
      @RequestHeader(value = "User-Agent", required = false) String ua,
      @RequestHeader(value = "X-Forwarded-For", required = false) String ip,
      HttpServletResponse response)
      throws Exception {
    String clientInfo =
        String.format(
            "IP: %s, UA: %s",
            ip != null ? ip : "unknown",
            ua != null ? ua.substring(0, Math.min(ua.length(), 100)) : "unknown");

    logger.info("Login attempt - {}", clientInfo);

    if (payload.idToken() == null || payload.idToken().trim().isEmpty()) {
      logger.warn("Login failed: missing ID token - {}", clientInfo);
      throw new ValidationException("ID token is required", "MISSING_ID_TOKEN", "id_token");
    }

    try {
      Map<String, Object> data = decode(payload.idToken());
      String sub = (String) data.get("sub");
      if (sub == null || sub.trim().isEmpty()) {
        logger.warn("Login failed: invalid ID token (missing sub) - {}", clientInfo);
        throw new UnauthorizedException(
            "Invalid ID token", "INVALID_TOKEN", "Token missing subject claim");
      }

      User user =
          users
              .findBySub(sub)
              .orElseGet(
                  () -> {
                    logger.info("Creating new user for sub: {} - {}", sub, clientInfo);
                    User u = new User();
                    u.setSub(sub);
                    return users.save(u);
                  });

      Session sess = new Session();
      sess.setUserId(user.getId());
      sess.setRefreshTokenHash("-");
      sess.setCreatedAt(Instant.now());
      sess.setExpiresAt(Instant.now().plusSeconds(maxAge));
      sess.setIp(ip);
      sess.setUserAgent(ua);
      sessions.save(sess);

      String jwt =
          Jwts.builder()
              .setSubject(sub)
              .claim("sid", sess.getId())
              .setExpiration(Date.from(sess.getExpiresAt()))
              .signWith(key)
              .compact();
      Cookie cookie = new Cookie("sid", jwt);
      cookie.setHttpOnly(true);
      cookie.setSecure(cookieSecure);
      cookie.setPath("/");
      cookie.setMaxAge((int) maxAge);
      if (!cookieDomain.isBlank()) cookie.setDomain(cookieDomain);
      response.addCookie(cookie);

      logger.info(
          "Login successful for user: {} - session: {} - {}",
          user.getId(),
          sess.getId(),
          clientInfo);
      return ResponseEntity.ok(Map.of("token", jwt));
    } catch (UnauthorizedException | ValidationException e) {
      throw e; // Re-throw our custom exceptions
    } catch (Exception e) {
      logger.error(
          "Login failed due to unexpected error - {} - Error: {}", clientInfo, e.getMessage(), e);
      throw new UnauthorizedException(
          "Authentication failed", "AUTH_FAILED", "Unable to process authentication request");
    }
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      @CookieValue(value = "sid", required = false) String sid, HttpServletResponse response) {
    logger.debug("Logout attempt");

    if (sid != null) {
      try {
        var claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(sid).getBody();
        Long sessionId = ((Number) claims.get("sid")).longValue();
        sessions.deleteById(sessionId);
        logger.info("Logout successful - session invalidated: {}", sessionId);
      } catch (Exception e) {
        logger.warn("Failed to parse session token during logout: {}", e.getMessage());
      }
    } else {
      logger.debug("Logout called without session cookie");
    }

    Cookie cookie = new Cookie("sid", "");
    cookie.setPath("/");
    cookie.setMaxAge(0);
    cookie.setHttpOnly(true);
    cookie.setSecure(cookieSecure);
    if (!cookieDomain.isBlank()) cookie.setDomain(cookieDomain);
    response.addCookie(cookie);
    return ResponseEntity.ok().build();
  }
}
