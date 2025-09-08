package com.clanboards.notifications.config;

import com.clanboards.notifications.model.Session;
import com.clanboards.notifications.repository.SessionRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthFilter extends OncePerRequestFilter {
  private final SessionRepository sessions;
  private final SecretKey key;
  private static final Logger logger = LoggerFactory.getLogger(AuthFilter.class);

  public AuthFilter(
      SessionRepository sessions, @Value("${jwt.signing-key:change-me}") String signingKey) {
    this.sessions = sessions;
    this.key = Keys.hmacShaKeyFor(signingKey.getBytes(StandardCharsets.UTF_8));
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String auth = request.getHeader("Authorization");
    String token = null;
    if (auth != null && auth.startsWith("Bearer ")) {
      token = auth.substring(7);
    } else if (request.getCookies() != null) {
      for (Cookie c : request.getCookies()) {
        if ("sid".equals(c.getName())) {
          token = c.getValue();
          break;
        }
      }
    }
    HttpServletRequest req = request;
    if (token != null) {
      try {
        Claims claims =
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        Long sessionId = ((Number) claims.get("sid")).longValue();
        if (sessionId != null) {
          Session sess = sessions.findById(sessionId).orElse(null);
          if (sess != null && sess.getExpiresAt().isAfter(Instant.now())) {
            request.setAttribute("userId", sess.getUserId());
            req =
                new HttpServletRequestWrapper(request) {
                  private final Principal principal = () -> String.valueOf(sess.getUserId());

                  @Override
                  public Principal getUserPrincipal() {
                    return principal;
                  }
                };
          }
        }
      } catch (Exception e) {
        logger.warn("Invalid session token", e);
      }
    }
    filterChain.doFilter(req, response);
  }
}
