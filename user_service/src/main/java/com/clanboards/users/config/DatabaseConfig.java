package com.clanboards.users.config;

import java.net.URI;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfig {
  @Bean
  public DataSource dataSource(
      @Value("${DATABASE_URL:}") String databaseUrl,
      @Value("${DATABASE_USERNAME:}") String username,
      @Value("${DATABASE_PASSWORD:}") String password)
      throws Exception {
    if (databaseUrl == null || databaseUrl.isBlank()) {
      return DataSourceBuilder.create()
          .driverClassName("org.h2.Driver")
          .url("jdbc:h2:mem:testdb")
          .username("sa")
          .password("")
          .build();
    }
    URI uri = new URI(databaseUrl);
    String userInfo = uri.getUserInfo();
    if (userInfo != null && (username == null || username.isBlank())) {
      String[] parts = userInfo.split(":", 2);
      username = parts[0];
      if (parts.length > 1) password = parts[1];
    }
    String jdbcUrl =
        "jdbc:postgresql://"
            + uri.getHost()
            + (uri.getPort() > 0 ? ":" + uri.getPort() : "")
            + uri.getPath();
    return DataSourceBuilder.create()
        .driverClassName("org.postgresql.Driver")
        .url(jdbcUrl)
        .username(username)
        .password(password)
        .build();
  }
}
