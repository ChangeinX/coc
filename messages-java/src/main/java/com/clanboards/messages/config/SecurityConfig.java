package com.clanboards.messages.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final OidcAuthenticationFilter oidcAuthenticationFilter;

  public SecurityConfig(OidcAuthenticationFilter oidcAuthenticationFilter) {
    this.oidcAuthenticationFilter = oidcAuthenticationFilter;
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
                        "/api/v1/chat/debug/request-info")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(oidcAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .csrf(csrf -> csrf.disable())
        .httpBasic(httpBasic -> httpBasic.disable())
        .formLogin(formLogin -> formLogin.disable());

    return http.build();
  }
}
