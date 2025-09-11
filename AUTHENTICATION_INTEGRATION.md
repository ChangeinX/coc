# Messages-Java Authentication Integration

## Overview

The messages-java service has been successfully integrated with the shared OIDC authentication system using the `java-auth-common` library. This document outlines the complete authentication flow, environment variables, and integration patterns for other services.

## Configuration Approach

### Database-Driven Configuration (Recommended)

OIDC configuration is now **database-driven** using the `system_config` table. This allows runtime updates without service restarts or rebuilds.

### Required Database Setup

1. **Run Flask Migration** (from `/db/` directory):
```bash
flask db migrate -m "add system_config table"
flask db upgrade
```

2. **Seed Configuration Values** (run in pgAdmin or psql):
```sql
INSERT INTO system_config (key, value, description) VALUES
('oidc.issuer', 'https://dev.api.clan-boards.com/api/v1/users', 'JWT issuer claim - must match ALB domain'),
('oidc.audience', 'clanboards-mobile', 'Expected JWT audience'),
('oidc.user_service_url', 'https://dev.api.clan-boards.com/api/v1/users', 'User service base URL for JWKS')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;
```

### Environment Variables (Fallback)

Services fall back to these if database values are not present:

```bash
# OIDC Configuration (fallback values)
auth.oidc.issuer=https://dev.api.clan-boards.com/api/v1/users
auth.oidc.audience=clanboards-mobile
auth.oidc.user-service-url=https://dev.api.clan-boards.com/api/v1/users

# Optional OIDC Configuration (with defaults)
auth.oidc.keys-cache-duration-minutes=15
auth.oidc.connection-timeout-seconds=10

# Database & Redis (existing)
spring.datasource.url=jdbc:postgresql://localhost:5432/messages
spring.datasource.username=messages_user
spring.datasource.password=your_password
spring.data.redis.url=redis://localhost:6379

# Service Port
server.port=8010
```

### Key Configuration Values Explained:

- **`oidc.issuer`**: Must match the JWT issuer claim exactly (ALB domain + `/api/v1/users`)
- **`oidc.audience`**: Must match the JWT audience claim (`clanboards-mobile`)
- **`oidc.user_service_url`**: Base URL for JWKS endpoint discovery (same as issuer typically)

## Authentication Architecture Flow

### 1. Token Issuance (User Service)
```
Google OAuth / Apple Sign-in → User Service → JWT Tokens (Access + ID + Refresh)
                     ↓
               Stores session in database
                     ↓
            Returns tokens to client
```

### 2. Client Authentication to Messages Service

#### Frontend/Mobile → Messages REST API:
```
Mobile App → API Request with "Authorization: Bearer <access_token>"
    ↓
Messages Service (OidcAuthenticationFilter)
    ↓
Validates token against User Service JWKS endpoint
    ↓
Extracts userId from token/session
    ↓
Adds user context to request
    ↓
Processes request
```

#### Frontend/Mobile → Messages WebSocket:
```
Mobile App → WebSocket CONNECT with "Authorization: Bearer <access_token>"
    ↓
Messages Service (WebSocketAuthChannelInterceptor)
    ↓
Validates token on CONNECT
    ↓
Stores user session in WebSocket session attributes
    ↓
Validates authentication on subsequent STOMP messages
    ↓
Routes messages to appropriate chat channels
```

### 3. Token Validation Process

```
1. Extract Bearer token from Authorization header
2. Fetch JWKS from User Service: {user-service-url}/oauth2/jwks.json
3. Verify JWT signature using public key from JWKS
4. Validate issuer claim matches auth.oidc.issuer
5. Validate audience claim matches auth.oidc.audience
6. Check token expiration
7. Extract userId from:
   - Session ID (sid claim) → lookup in session repository
   - Direct userId claim
   - Subject (sub) claim
8. Add user context to request/session
```

## Client Implementation

### Mobile/Frontend Authentication Headers

The frontend/mobile clients are **already configured** to send proper authentication headers:

#### REST API Calls:
```typescript
// From mobile/src/services/apiClient.ts
async function withAuth(headers: Headers): Promise<Headers> {
  const tokens = await tokenStorage.get();
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return headers;
}

// GraphQL requests to messages service
const url = `${MESSAGES_URL}/api/v1/chat/graphql`;
const response = await apiFetch<GraphQLResponse<T>>(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  auth: true, // Automatically adds Authorization header
  body: JSON.stringify({ query, variables })
});
```

#### WebSocket Connections:
```typescript
// From mobile/src/services/websocketClient.ts
this.client = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/api/v1/chat/socket`),
  connectHeaders: {
    Authorization: `Bearer ${tokens.accessToken}`,
  },
  // ... other config
});
```

### Authentication Endpoints

The messages service exposes these protected endpoints:

#### REST Endpoints:
- **Protected**: `/api/v1/chat/graphql` - GraphQL API
- **Protected**: All other `/api/v1/chat/*` endpoints  
- **Excluded**: `/api/v1/chat/health`, `/actuator/health`, `/health` - Health checks

#### WebSocket Endpoints:
- **Protected**: `/api/v1/chat/socket` - STOMP WebSocket connection
- **Protected**: All STOMP message destinations (`/topic/chat/{chatId}`)

## Database Configuration Management

### SystemConfig Table Structure

```sql
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Configuration Loading Process

1. **Startup**: `OidcPropertiesLoader` loads config from database via `@PostConstruct`
2. **Fallback**: Uses `application.yml` values if database entries don't exist
3. **Runtime Updates**: Configuration can be updated in database without service restart
4. **Refresh**: Call `OidcPropertiesLoader.refresh()` to reload from database

### Benefits of Database Configuration

- ✅ **No rebuilds/redeploys** when ALB domain changes
- ✅ **Centralized configuration** across all microservices  
- ✅ **Environment-specific** values without code changes
- ✅ **Runtime updates** for operational flexibility
- ✅ **Audit trail** with updated_at timestamps
- ✅ **Graceful fallback** to application.yml

### Updating Configuration at Runtime

```sql
-- Update issuer for environment change
UPDATE system_config 
SET value = 'https://prod.api.clan-boards.com/api/v1/users',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'oidc.issuer';

-- Update audience if needed
UPDATE system_config 
SET value = 'clanboards-mobile-v2',
    updated_at = CURRENT_TIMESTAMP  
WHERE key = 'oidc.audience';
```

## Integration Guide for Other Services

### Step 1: Add Dependency

Add to your service's `build.gradle`:

```gradle
dependencies {
    implementation 'com.clanboards:java-auth-common:1.0.0'
    // ... other dependencies
}

repositories {
    mavenLocal()
    mavenCentral()
}
```

### Step 2: Configure Properties

Add to `application.yml` or environment variables:

```yaml
auth:
  oidc:
    issuer: ${AUTH_OIDC_ISSUER:https://your-user-service.com/api/v1/users}
    audience: ${AUTH_OIDC_AUDIENCE:clanboards-mobile}
    user-service-url: ${AUTH_OIDC_USER_SERVICE_URL:https://your-user-service.com/api/v1/users}
    keys-cache-duration-minutes: ${AUTH_OIDC_KEYS_CACHE_DURATION:15}
    connection-timeout-seconds: ${AUTH_OIDC_CONNECTION_TIMEOUT:10}
```

### Step 3: Configure Authentication

Create auth configuration class:

```java
@Configuration
@EnableConfigurationProperties(OidcProperties.class)
public class AuthConfig {

    @Bean
    @Primary
    public OidcTokenValidator oidcTokenValidatorWithSessions(
            JwksService jwksService, 
            OidcProperties oidcProperties, 
            YourSessionRepository sessionRepository) {
        
        // Adapter to bridge your session repository with shared auth library
        com.clanboards.auth.repository.SessionRepository<YourSession> authSessionRepo = 
            new com.clanboards.auth.repository.SessionRepository<YourSession>() {
                @Override
                public Optional<YourSession> findById(Long id) {
                    return sessionRepository.findById(id);
                }
            };
        
        return new OidcTokenValidator(jwksService, oidcProperties, authSessionRepo);
    }
}
```

### Step 4: Add REST Authentication Filter

```java
@Component
public class OidcAuthenticationFilter implements Filter {
    private static final Set<String> EXCLUDED_PATHS = Set.of(
        "/api/v1/your-service/health",
        "/actuator/health",
        "/health"
    );

    private final OidcTokenValidator tokenValidator;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String path = httpRequest.getRequestURI();
        
        if (EXCLUDED_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            ((HttpServletResponse) response).setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }

        try {
            String token = authHeader.substring(7);
            Claims claims = tokenValidator.validateToken(token);
            Long userId = tokenValidator.extractUserId(claims);
            
            // Add user context to request attributes
            httpRequest.setAttribute("userId", userId);
            httpRequest.setAttribute("claims", claims);
            
            chain.doFilter(request, response);
        } catch (Exception e) {
            ((HttpServletResponse) response).setStatus(HttpStatus.UNAUTHORIZED.value());
        }
    }
}
```

### Step 5: Register Filter

```java
@Configuration
public class SecurityConfig {
    
    @Bean
    public FilterRegistrationBean<OidcAuthenticationFilter> authenticationFilter(
            OidcAuthenticationFilter filter) {
        FilterRegistrationBean<OidcAuthenticationFilter> registration = 
            new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/v1/your-service/*");
        registration.setOrder(1);
        return registration;
    }
}
```

### Step 6: WebSocket Authentication (if needed)

For WebSocket endpoints, create a channel interceptor:

```java
@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {
    private final OidcTokenValidator tokenValidator;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);
            try {
                Claims claims = tokenValidator.validateToken(token);
                Long userId = tokenValidator.extractUserId(claims);
                accessor.getSessionAttributes().put("userId", userId);
                accessor.getSessionAttributes().put("claims", claims);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid authentication token");
            }
        }
        
        return message;
    }
}
```

## Service Dependencies

### User Service (Issuer)
- **Purpose**: Issues JWT tokens, provides JWKS endpoint
- **JWKS Endpoint**: `{user-service-url}/oauth2/jwks.json`
- **Discovery Endpoint**: `{user-service-url}/.well-known/openid-configuration`

### Messages Service (Resource Server)
- **Purpose**: Validates tokens, serves protected chat resources
- **Dependencies**: User service for JWKS
- **Authentication**: REST + WebSocket

## Security Considerations

1. **Token Validation**: All tokens are validated against the user service JWKS endpoint
2. **Session Management**: Session-based tokens are validated against the session repository
3. **Health Endpoints**: Health check endpoints are excluded from authentication
4. **WebSocket Security**: STOMP connections are authenticated on CONNECT and subsequent messages
5. **Cache Management**: JWKS are cached for 15 minutes to reduce load on user service

## Troubleshooting

### Common Issues:

1. **Token validation fails**:
   - Check `auth.oidc.issuer` matches the issuer in JWT tokens
   - Verify `auth.oidc.audience` matches the audience in JWT tokens
   - Ensure user service JWKS endpoint is accessible

2. **WebSocket connection fails**:
   - Verify Authorization header is included in STOMP CONNECT frame
   - Check token validity and expiration

3. **Service can't resolve java-auth-common dependency**:
   - Ensure `mavenLocal()` is in repositories
   - Verify java-auth-common is published to local Maven repository
   - Check version number matches in dependency declaration

4. **Health endpoints return 401**:
   - Verify health endpoints are in the excluded paths list
   - Check filter URL patterns don't overlap with health endpoints

This integration provides a robust, scalable authentication system that can be easily replicated across all Java services in the microservices architecture.

## Spring Security Configuration Fix

### Problem
When using `java-auth-common`, Spring Security can intercept health endpoints before custom OIDC filters, causing 401 errors.

### Solution  
Create explicit `SecurityConfig.java` to allow health endpoints:

```java
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
    http.authorizeHttpRequests(authz ->
            authz.requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                 .anyRequest().authenticated())
        .addFilterBefore(oidcAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .csrf(csrf -> csrf.disable())
        .httpBasic(httpBasic -> httpBasic.disable())
        .formLogin(formLogin -> formLogin.disable());
    return http.build();
  }
}
```