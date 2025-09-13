package com.clanboards.messages.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

  private final OidcAuthenticationFilter oidcAuthenticationFilter;

  public SecurityConfig(OidcAuthenticationFilter oidcAuthenticationFilter) {
    this.oidcAuthenticationFilter = oidcAuthenticationFilter;
  }

  @Bean
  public AccessDeniedHandler accessDeniedHandler() {
    return (HttpServletRequest request,
        HttpServletResponse response,
        AccessDeniedException accessDeniedException) -> {
      String requestId = MDC.get("requestId");
      String userId = (String) request.getAttribute("userId");
      Boolean authenticated = (Boolean) request.getAttribute("authenticated");

      logger.error(
          "[{}] ACCESS DENIED (403): {} {} - User: {}, Authenticated: {}, Exception: {}",
          requestId != null ? requestId : "unknown",
          request.getMethod(),
          request.getRequestURI(),
          userId != null ? userId : "none",
          Boolean.TRUE.equals(authenticated),
          accessDeniedException.getMessage());

      logger.error(
          "[{}] Request details - AuthHeader: {}, Cookie: {}, RemoteAddr: {}",
          requestId != null ? requestId : "unknown",
          request.getHeader("Authorization") != null ? "present" : "missing",
          request.getHeader("Cookie") != null ? "present" : "missing",
          request.getRemoteAddr());

      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      response.setContentType("application/json");
      response
          .getWriter()
          .write("{\"error\":\"Access Denied\",\"message\":\"Insufficient permissions\"}");
    };
  }

  @Bean
  public AuthenticationEntryPoint authenticationEntryPoint() {
    return (HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException authException) -> {
      String requestId = MDC.get("requestId");
      String userId = (String) request.getAttribute("userId");

      logger.error(
          "[{}] AUTHENTICATION FAILED (401): {} {} - User: {}, Exception: {}",
          requestId != null ? requestId : "unknown",
          request.getMethod(),
          request.getRequestURI(),
          userId != null ? userId : "none",
          authException.getMessage());

      logger.error(
          "[{}] Auth failure details - AuthHeader: {}, Cookie: {}, RemoteAddr: {}",
          requestId != null ? requestId : "unknown",
          request.getHeader("Authorization") != null ? "present" : "missing",
          request.getHeader("Cookie") != null ? "present" : "missing",
          request.getRemoteAddr());

      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json");
      response
          .getWriter()
          .write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
    };
  }

  @Bean
  @Order(1)
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            authz ->
                authz
                    .requestMatchers(
                        "/api/v1/health",
                        "/api/v1/chat/health",
                        "/actuator/health",
                        "/health",
                        "/api/v1/chat/debug/config",
                        "/api/v1/chat/debug/validate",
                        "/api/v1/chat/debug/request-info",
                        "/api/v1/chat/debug/jwks-cache",
                        "/api/v1/chat/socket",
                        "/api/v1/chat/socket/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(oidcAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(
            exceptions ->
                exceptions
                    .accessDeniedHandler(accessDeniedHandler())
                    .authenticationEntryPoint(authenticationEntryPoint()))
        // Preserve SecurityContext across forwards/error/async within the same request
        .securityContext(
            context ->
                context.securityContextRepository(new RequestAttributeSecurityContextRepository()))
        .csrf(csrf -> csrf.disable())
        .httpBasic(httpBasic -> httpBasic.disable())
        .formLogin(formLogin -> formLogin.disable())
        .sessionManagement(
            session ->
                session.sessionCreationPolicy(
                    org.springframework.security.config.http.SessionCreationPolicy.STATELESS));

    return http.build();
  }
}
