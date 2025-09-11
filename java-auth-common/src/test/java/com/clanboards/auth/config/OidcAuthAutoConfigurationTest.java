package com.clanboards.auth.config;

import static org.assertj.core.api.Assertions.*;

import com.clanboards.auth.service.JwksService;
import com.clanboards.auth.service.OidcTokenValidator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OidcAuthAutoConfigurationTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner()
          .withConfiguration(AutoConfigurations.of(OidcAuthAutoConfiguration.class));

  @Test
  void autoConfiguration_createsRequiredBeans() {
    this.contextRunner.run(
        context -> {
          assertThat(context).hasSingleBean(OidcProperties.class);
          assertThat(context).hasSingleBean(JwksService.class);
          assertThat(context).hasSingleBean(OidcTokenValidator.class);
        });
  }

  @Test
  void autoConfiguration_withCustomProperties_usesCustomValues() {
    this.contextRunner
        .withPropertyValues(
            "auth.oidc.issuer=https://custom-issuer.com",
            "auth.oidc.audience=custom-audience",
            "auth.oidc.user-service-url=https://custom-user-service.com")
        .run(
            context -> {
              OidcProperties properties = context.getBean(OidcProperties.class);
              assertThat(properties.getIssuer()).isEqualTo("https://custom-issuer.com");
              assertThat(properties.getAudience()).isEqualTo("custom-audience");
              assertThat(properties.getUserServiceUrl())
                  .isEqualTo("https://custom-user-service.com");
            });
  }

  @Test
  void oidcProperties_hasCorrectDefaults() {
    this.contextRunner.run(
        context -> {
          OidcProperties properties = context.getBean(OidcProperties.class);
          assertThat(properties).isNotNull();
          // Default values will be null until set by configuration properties
          assertThat(properties.getKeysCacheDurationMinutes()).isEqualTo(15);
          assertThat(properties.getConnectionTimeoutSeconds()).isEqualTo(10);
        });
  }
}
