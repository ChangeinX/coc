package com.clanboards.messages.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.graphql.server.WebGraphQlInterceptor;

class GraphQLConfigTest {

  @Test
  void testInterceptorBean_IsCreated() {
    // Test that the bean is properly created
    GraphQLConfig config = new GraphQLConfig();
    WebGraphQlInterceptor interceptor = config.authContextInterceptor();
    assertNotNull(interceptor);
  }
}
