package com.clanboards.messages.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
public class RedisConfig {
  @Bean
  public RedisConnectionFactory redisConnectionFactory(
      @Value("${REDIS_URL:redis://localhost:6379}") String url) {
    URI uri = URI.create(url);
    RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
    config.setHostName(uri.getHost());
    if (uri.getPort() != -1) {
      config.setPort(uri.getPort());
    }
    if (uri.getUserInfo() != null && uri.getUserInfo().contains(":")) {
      String[] parts = uri.getUserInfo().split(":", 2);
      config.setUsername(parts[0]);
      config.setPassword(parts[1]);
    }
    return new LettuceConnectionFactory(config);
  }

  @Bean
  public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
    return new StringRedisTemplate(factory);
  }
}
