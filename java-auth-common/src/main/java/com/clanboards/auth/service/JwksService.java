package com.clanboards.auth.service;

import com.clanboards.auth.config.OidcProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SigningKeyResolverAdapter;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class JwksService {
  private static final Logger logger = LoggerFactory.getLogger(JwksService.class);
  // no-op: trigger pre-commit java tests path when enabled

  private final OidcProperties oidcProperties;
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final JwksContentProvider jwksContentProvider;
  private final Map<String, PublicKey> keyCache = new ConcurrentHashMap<>();
  private volatile Instant lastFetch = Instant.EPOCH;

  public JwksService(OidcProperties oidcProperties) {
    this(oidcProperties, null);
  }

  public JwksService(OidcProperties oidcProperties, JwksContentProvider jwksContentProvider) {
    this.oidcProperties = oidcProperties;
    this.jwksContentProvider = jwksContentProvider;
    this.httpClient =
        jwksContentProvider == null
            ? HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(oidcProperties.getConnectionTimeoutSeconds()))
                .build()
            : null;
    this.objectMapper = new ObjectMapper();
  }

  public Claims parseAndValidateJwt(String token) throws Exception {
    return Jwts.parserBuilder()
        .setSigningKeyResolver(new JwksSigningKeyResolver())
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  private void refreshKeysIfNeeded() {
    Duration cacheDuration = Duration.ofMinutes(oidcProperties.getKeysCacheDurationMinutes());
    if (Instant.now().minus(cacheDuration).isAfter(lastFetch)) {
      try {
        fetchJwksKeys();
      } catch (Exception e) {
        logger.warn("Failed to refresh JWKS keys", e);
      }
    }
  }

  private void fetchJwksKeys() throws Exception {
    String jwksJson;

    if (jwksContentProvider != null) {
      logger.debug("Fetching JWKS keys from provider");
      jwksJson = jwksContentProvider.loadJwksJson();
    } else if (oidcProperties.isDisallowHttp()) {
      throw new RuntimeException(
          "HTTP JWKS fetching is disabled but no JwksContentProvider available. "
              + "Set auth.oidc.disallow-http=false or provide a JwksContentProvider bean.");
    } else {
      String jwksUrl = oidcProperties.getJwksUrl();
      logger.debug("Fetching JWKS keys from HTTP: {}", jwksUrl);

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(jwksUrl))
              .timeout(Duration.ofSeconds(oidcProperties.getConnectionTimeoutSeconds()))
              .GET()
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() != 200) {
        throw new RuntimeException(
            "Failed to fetch JWKS: " + response.statusCode() + " - " + response.body());
      }

      jwksJson = response.body();
    }

    JsonNode jwks = objectMapper.readTree(jwksJson);
    JsonNode keys = jwks.get("keys");

    if (keys == null || !keys.isArray()) {
      throw new RuntimeException("Invalid JWKS format: missing keys array");
    }

    keyCache.clear();
    for (JsonNode key : keys) {
      String kid = key.get("kid").asText();
      String kty = key.get("kty").asText();

      if ("RSA".equals(kty)) {
        PublicKey publicKey = parseRsaKey(key);
        keyCache.put(kid, publicKey);
        logger.debug("Cached RSA key with kid: {}", kid);
      }
    }

    lastFetch = Instant.now();
    logger.info("Successfully cached {} keys from JWKS", keyCache.size());
  }

  private PublicKey parseRsaKey(JsonNode key) throws Exception {
    String nStr = key.get("n").asText();
    String eStr = key.get("e").asText();

    byte[] nBytes = Base64.getUrlDecoder().decode(nStr);
    byte[] eBytes = Base64.getUrlDecoder().decode(eStr);

    BigInteger modulus = new BigInteger(1, nBytes);
    BigInteger exponent = new BigInteger(1, eBytes);

    RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
    KeyFactory factory = KeyFactory.getInstance("RSA");
    return factory.generatePublic(spec);
  }

  private class JwksSigningKeyResolver extends SigningKeyResolverAdapter {
    @Override
    public Key resolveSigningKey(JwsHeader header, Claims claims) {
      String kid = header.getKeyId();
      if (kid == null) {
        throw new RuntimeException("JWT header missing 'kid' (key ID)");
      }

      refreshKeysIfNeeded();

      PublicKey key = keyCache.get(kid);
      if (key == null) {
        // Try to refresh once more in case the key is new
        try {
          fetchJwksKeys();
          key = keyCache.get(kid);
        } catch (Exception e) {
          logger.error("Failed to fetch JWKS keys for kid: {}", kid, e);
        }
      }

      if (key == null) {
        throw new RuntimeException("No key found for kid: " + kid);
      }

      return key;
    }
  }
}
