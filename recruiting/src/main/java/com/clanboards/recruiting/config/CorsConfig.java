package com.clanboards.recruiting.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

@Configuration
public class CorsConfig {
  private final SecretsManagerClient secrets;
  private final String allowedOrigins;
  private final String secretName;

  public CorsConfig(
      SecretsManagerClient secrets,
      @Value("${cors.allowed-origins:*}") String allowedOrigins,
      @Value("${cors.secret-name:}") String secretName) {
    this.secrets = secrets;
    this.allowedOrigins = allowedOrigins;
    this.secretName = secretName;
  }

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    String origins = this.allowedOrigins;
    if ((origins == null || origins.isBlank()) && !this.secretName.isBlank()) {
      try {
        origins =
            secrets
                .getSecretValue(GetSecretValueRequest.builder().secretId(this.secretName).build())
                .secretString();
      } catch (Exception ignored) {
      }
    }
    if (origins == null || origins.isBlank()) {
      origins = "*";
    }
    String[] patterns = Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new);

    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry
            .addMapping("/api/**")
            .allowedOriginPatterns(patterns)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
      }
    };
  }
}
