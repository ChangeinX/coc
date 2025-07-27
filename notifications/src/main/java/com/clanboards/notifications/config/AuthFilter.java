package com.clanboards.notifications.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthFilter extends OncePerRequestFilter {
  private final byte[] key;

  public AuthFilter(@Value("${jwt.signing-key:change-me}") String key) {
    this.key = key.getBytes(StandardCharsets.UTF_8);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String auth = request.getHeader("Authorization");
    HttpServletRequest req = request;
    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
      try {
        Claims claims =
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(key))
                .build()
                .parseClaimsJws(token)
                .getBody();
        String sub = claims.get("sub", String.class);
        if (sub != null) {
          request.setAttribute("sub", sub);
          req =
              new HttpServletRequestWrapper(request) {
                private final Principal principal = () -> sub;

                @Override
                public Principal getUserPrincipal() {
                  return principal;
                }
              };
        }
      } catch (Exception ignored) {
      }
    }
    filterChain.doFilter(req, response);
  }
}
