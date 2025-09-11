# Authentication Integration - Zero-HTTP JWKS Implementation

## Overview

The authentication system has been upgraded to **eliminate all service-to-service HTTP calls** for token validation. The messages-java service and other Java services now validate JWT tokens using a **database-backed JWKS** system instead of HTTP calls to the user_service.

## Key Architectural Change: Zero HTTP Calls

### Before: HTTP-Based JWKS (❌ DEPRECATED)
```
messages-java → HTTP GET → user_service/oauth2/jwks.json → Validate JWT
```

### After: Database-Backed JWKS (✅ CURRENT)
```
user_service → Publishes JWKS → Database (system_config)
messages-java → Reads JWKS → Database → Validate JWT (NO HTTP CALLS)
```

## Configuration Approach

### Database-Driven JWKS Configuration (COMPLETE)

JWKS (JSON Web Key Set) data is now **database-backed** using the `system_config` table. This eliminates HTTP dependencies between services while providing centralized key management.

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
('oidc.jwks', '{"keys":[]}', 'JWKS JSON - auto-populated by user_service on startup')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;
```

**Important**: The `oidc.jwks` entry will be **automatically populated** by the user_service on startup. Do not manually edit this value.

### Environment Variables (Updated Configuration)

**Messages-Java and other consuming services:**
```bash
# OIDC Configuration - Database-Backed (NO HTTP CALLS)
# Issuer and Audience are loaded from database system_config and are REQUIRED.
# Services will fail to start if these keys are missing:
#   - system_config(oidc.issuer)
#   - system_config(oidc.audience)
auth.oidc.jwks-source=db
auth.oidc.jwks-db-key=oidc.jwks
auth.oidc.disallow-http=true

# Optional OIDC Configuration (with defaults)
auth.oidc.keys-cache-duration-minutes=15

# Database & Redis (existing)
spring.datasource.url=jdbc:postgresql://localhost:5432/messages
spring.datasource.username=messages_user
spring.datasource.password=your_password
spring.data.redis.url=redis://localhost:6379

# Service Port
server.port=8010
```

**User-Service (JWKS publisher):**
```bash
# OIDC Configuration
auth.oidc.issuer=https://dev.api.clan-boards.com/api/v1/users
auth.oidc.audience=clanboards-mobile
auth.oidc.jwks-db-key=oidc.jwks

# Database connection
spring.datasource.url=jdbc:postgresql://localhost:5432/users
spring.datasource.username=users_user
spring.datasource.password=your_password
```

### Key Configuration Values Explained:

- **`oidc.issuer` (DB)**: Must match the JWT issuer claim exactly (ALB domain + `/api/v1/users`)
- **`oidc.audience` (DB)**: Must match the JWT audience claim (`clanboards-mobile`)
- **`oidc.jwks-source`**: Set to `"db"` to use database-backed JWKS (eliminates HTTP calls)
- **`oidc.jwks-db-key`**: Database key where JWKS JSON is stored (`"oidc.jwks"`)
- **`oidc.disallow-http`**: Set to `true` to prevent HTTP fallback (guarantees zero HTTP calls)

## Authentication Architecture Flow

### 1. Token Issuance (User Service)
```
Google OAuth / Apple Sign-in → User Service → JWT Tokens (Access + ID + Refresh)
                     ↓
               Stores session in database
                     ↓
            Returns tokens to client
```

### 2. JWKS Publication (User Service - NEW)
```
User Service Startup → JwksPublisher (@PostConstruct)
                 ↓
        Generates JWKS JSON from KeyHolder
                 ↓
     Saves to system_config table (key: 'oidc.jwks')
                 ↓
           Available to all services
```

### 3. Client Authentication to Messages Service

#### Frontend/Mobile → Messages REST API:
```
Mobile App → API Request with "Authorization: Bearer <access_token>"
    ↓
Messages Service (OidcAuthenticationFilter)
    ↓
Validates token using Database JWKS (NO HTTP CALL)
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
Validates token using Database JWKS (NO HTTP CALL)
    ↓
Stores user session in WebSocket session attributes
    ↓
Validates authentication on subsequent STOMP messages
    ↓
Routes messages to appropriate chat channels
```

### 4. Token Validation Process (Updated - Zero HTTP)

```
1. Extract Bearer token from Authorization header
2. Load JWKS from Database: SELECT value FROM system_config WHERE key='oidc.jwks'
3. Parse JWKS JSON and extract public keys (cached for 15 minutes)
4. Verify JWT signature using public key from database JWKS
5. Validate issuer claim matches auth.oidc.issuer
6. Validate audience claim matches auth.oidc.audience
7. Check token expiration
8. Extract userId from:
   - Session ID (sid claim) → lookup in session repository
   - Direct userId claim
   - Subject (sub) claim
9. Add user context to request/session
```

### 5. Key Rotation Process (NEW)

```
User Service Key Rotation:
1. Generate new RSA keypair
2. Update KeyHolder with new keys
3. Call jwksPublisher.republishJwks()
4. New JWKS JSON saved to database
5. All services pick up new keys within cache TTL (15 min)
6. Zero downtime, zero HTTP calls
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
