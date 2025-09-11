package com.clanboards.auth.config;

import com.clanboards.auth.graphql.OidcGraphQLInterceptor;
import com.clanboards.auth.service.JwksService;
import com.clanboards.auth.service.OidcTokenValidator;
import com.clanboards.auth.web.OidcAuthenticationFilter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.graphql.server.WebGraphQlInterceptor;

@AutoConfiguration
@EnableConfigurationProperties(OidcProperties.class)
public class OidcAuthAutoConfiguration {

  @Bean
  @ConditionalOnMissingBean
  public JwksService jwksService(OidcProperties oidcProperties) {
    return new JwksService(oidcProperties);
  }

  @Bean
  @ConditionalOnMissingBean
  public OidcTokenValidator oidcTokenValidator(
      JwksService jwksService, OidcProperties oidcProperties) {
    return new OidcTokenValidator(jwksService, oidcProperties);
  }

  @Bean
  @ConditionalOnClass(name = "org.springframework.graphql.server.WebGraphQlInterceptor")
  @ConditionalOnMissingBean
  public WebGraphQlInterceptor oidcGraphQLInterceptor(OidcTokenValidator tokenValidator) {
    return new OidcGraphQLInterceptor(tokenValidator);
  }

  @Bean
  @ConditionalOnMissingBean(name = "oidcAuthenticationFilter")
  public OidcAuthenticationFilter oidcAuthenticationFilter(OidcTokenValidator tokenValidator) {
    return new OidcAuthenticationFilter(tokenValidator);
  }
}
