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

  private final OidcProperties oidcProperties;
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final JwksContentProvider jwksContentProvider;
  private final Map<String, PublicKey> keyCache = new ConcurrentHashMap<>();
  private volatile Instant lastFetch = Instant.EPOCH;
  private volatile Instant providerLastUpdated = null;

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
    try {
      return Jwts.parserBuilder()
          .setSigningKeyResolver(new JwksSigningKeyResolver())
          .build()
          .parseClaimsJws(token)
          .getBody();
    } catch (io.jsonwebtoken.security.SignatureException se) {
      // Signature failed. Force a one-time refresh and retry to handle same-kid/new-key rotations.
      logger.warn("JWT signature validation failed. Forcing JWKS refresh and retry.");
      try {
        fetchJwksKeys();
      } catch (Exception e) {
        logger.warn("Forced JWKS refresh failed after signature error", e);
      }

      return Jwts.parserBuilder()
          .setSigningKeyResolver(new JwksSigningKeyResolver())
          .build()
          .parseClaimsJws(token)
          .getBody();
    }
  }

  private void refreshKeysIfNeeded() {
    Duration cacheDuration = Duration.ofMinutes(oidcProperties.getKeysCacheDurationMinutes());
    boolean ttlExpired = Instant.now().minus(cacheDuration).isAfter(lastFetch);
    boolean providerUpdated = false;
    if (jwksContentProvider != null) {
      try {
        Instant lu = jwksContentProvider.lastUpdated();
        if (lu != null && (providerLastUpdated == null || lu.isAfter(providerLastUpdated))) {
          providerUpdated = true;
        }
      } catch (Exception e) {
        logger.debug("Failed to read provider lastUpdated: {}", e.getMessage());
      }
    }

    if (ttlExpired || providerUpdated) {
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
      try {
        providerLastUpdated = jwksContentProvider.lastUpdated();
      } catch (Exception e) {
        // ignore; keep previous value
      }
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

  /**
   * Exposes a fingerprint of cached keys for diagnostics (kid -> SHA-256 of RSA modulus in hex).
   */
  public Map<String, String> getCachedKeyFingerprints() {
    java.util.Map<String, String> out = new java.util.HashMap<>();
    for (var e : keyCache.entrySet()) {
      var k = e.getValue();
      if (k instanceof java.security.interfaces.RSAPublicKey rsa) {
        byte[] modBytes = rsa.getModulus().toByteArray();
        if (modBytes.length > 1 && modBytes[0] == 0) {
          byte[] tmp = new byte[modBytes.length - 1];
          System.arraycopy(modBytes, 1, tmp, 0, tmp.length);
          modBytes = tmp;
        }
        try {
          var md = java.security.MessageDigest.getInstance("SHA-256");
          byte[] digest = md.digest(modBytes);
          out.put(e.getKey(), java.util.HexFormat.of().formatHex(digest));
        } catch (Exception ex) {
          out.put(e.getKey(), "<error>");
        }
      } else {
        out.put(e.getKey(), "<non-rsa>");
      }
    }
    return out;
  }

  public Instant getLastFetch() {
    return lastFetch;
  }

  public Instant getProviderLastUpdated() {
    return providerLastUpdated;
  }
}
