package com.clanboards.users.controller;

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
    Map<String, Object> data = decode(payload.idToken());
    String sub = (String) data.get("sub");
    if (sub == null) {
      return ResponseEntity.status(401).build();
    }
    User user =
        users
            .findBySub(sub)
            .orElseGet(
                () -> {
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
    return ResponseEntity.ok(Map.of("token", jwt));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      @CookieValue(value = "sid", required = false) String sid, HttpServletResponse response) {
    if (sid != null) {
      try {
        var claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(sid).getBody();
        Long id = ((Number) claims.get("sid")).longValue();
        sessions.deleteById(id);
      } catch (Exception ignored) {
      }
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
