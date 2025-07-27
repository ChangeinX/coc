package com.clanboards.users.config;

import com.clanboards.users.model.Session;
import com.clanboards.users.repository.SessionRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionFilter extends OncePerRequestFilter {
  private final SessionRepository sessions;
  private final SecretKey key;
  private static final Logger logger = LoggerFactory.getLogger(SessionFilter.class);

  public SessionFilter(
      SessionRepository sessions, @Value("${jwt.signing-key:secret}") String signingKey) {
    this.sessions = sessions;
    this.key = Keys.hmacShaKeyFor(signingKey.getBytes(StandardCharsets.UTF_8));
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String token = null;
    if (request.getCookies() != null) {
      for (Cookie c : request.getCookies()) {
        if ("sid".equals(c.getName())) {
          token = c.getValue();
          break;
        }
      }
    }
    if (token != null) {
      try {
        Claims claims =
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        Long id = ((Number) claims.get("sid")).longValue();
        Session sess = sessions.findById(id).orElse(null);
        if (sess != null && sess.getExpiresAt().isAfter(Instant.now())) {
          request.setAttribute("userId", sess.getUserId());
        }
      } catch (Exception e) {
        logger.warn("Invalid session token", e);
      }
    }
    filterChain.doFilter(request, response);
  }
}
