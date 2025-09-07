package com.clanboards.users.controller;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.config.OidcProperties;
import com.clanboards.users.model.Session;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.SessionRepository;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class OidcController {
  private final KeyHolder keys;
  private final SessionRepository sessions;
  private final UserRepository users;
  private final TokenService tokens;
  private final OidcProperties props;

  public OidcController(
      KeyHolder keys,
      SessionRepository sessions,
      UserRepository users,
      TokenService tokens,
      OidcProperties props) {
    this.keys = keys;
    this.sessions = sessions;
    this.users = users;
    this.tokens = tokens;
    this.props = props;
  }

  @GetMapping(path = "/oauth2/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> jwks() {
    return ResponseEntity.ok(keys.jwksJson());
  }

  @PostMapping(
      path = "/oauth2/token",
      consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> token(@RequestBody MultiValueMap<String, String> form) {
    String grantType = Optional.ofNullable(form.getFirst("grant_type")).orElse("");
    if (!"refresh_token".equals(grantType)) {
      return ResponseEntity.badRequest().body(Map.of("error", "unsupported_grant_type"));
    }
    String refreshToken = Optional.ofNullable(form.getFirst("refresh_token")).orElse("");
    if (refreshToken.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid_request"));
    }
    // Lookup session by hashed refresh token
    String hash = sha256Hex(refreshToken);
    Session sess = sessions.findByRefreshTokenHash(hash).orElse(null);
    if (sess == null
        || sess.getExpiresAt() == null
        || sess.getExpiresAt().isBefore(Instant.now())) {
      return ResponseEntity.status(401).body(Map.of("error", "invalid_grant"));
    }
    User user = users.findById(sess.getUserId()).orElse(null);
    if (user == null) {
      return ResponseEntity.status(401).body(Map.of("error", "invalid_grant"));
    }
    var pair = tokens.issueAccessAndId(user, sess.getId());
    return ResponseEntity.ok(
        Map.of(
            "access_token", pair.accessToken(),
            "id_token", pair.idToken(),
            "token_type", "Bearer",
            "expires_in", pair.expiresInSeconds()));
  }

  @PostMapping(path = "/oauth2/revoke", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
  public ResponseEntity<?> revoke(@RequestBody MultiValueMap<String, String> form) {
    String token = Optional.ofNullable(form.getFirst("token")).orElse("");
    if (token.isBlank()) {
      return ResponseEntity.badRequest().build();
    }
    String hash = sha256Hex(token);
    sessions.findByRefreshTokenHash(hash).ifPresent(s -> sessions.deleteById(s.getId()));
    return ResponseEntity.ok().build();
  }

  @GetMapping(
      path = "/.well-known/openid-configuration",
      produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> discovery() {
    String base = props.getIssuer();
    var map = new java.util.HashMap<String, Object>();
    map.put("issuer", base);
    map.put("jwks_uri", base + "/oauth2/jwks.json");
    map.put("token_endpoint", base + "/oauth2/token");
    map.put("revocation_endpoint", base + "/oauth2/revoke");
    map.put("userinfo_endpoint", base + "/userinfo");
    map.put("response_types_supported", List.of("code"));
    map.put("grant_types_supported", List.of("authorization_code", "refresh_token"));
    map.put("subject_types_supported", List.of("public"));
    map.put("id_token_signing_alg_values_supported", List.of("RS256"));
    map.put("scopes_supported", List.of("openid", "email", "profile"));
    map.put("claims_supported", List.of("sub", "email", "email_verified", "name"));
    return ResponseEntity.ok(map);
  }

  @GetMapping(path = "/userinfo", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> userinfo(@RequestHeader HttpHeaders headers) {
    String auth = headers.getFirst(HttpHeaders.AUTHORIZATION);
    if (auth == null || !auth.startsWith("Bearer ")) {
      return ResponseEntity.status(401).body(Map.of("error", "invalid_token"));
    }
    String token = auth.substring("Bearer ".length());
    try {
      Jws<Claims> jws =
          Jwts.parserBuilder().setSigningKey(keys.getPublicKey()).build().parseClaimsJws(token);
      Claims c = jws.getBody();
      if (!props.getIssuer().equals(c.get("iss")) || !props.getAudience().equals(c.get("aud"))) {
        return ResponseEntity.status(401).body(Map.of("error", "invalid_token"));
      }
      return ResponseEntity.ok(Map.of("sub", c.get("sub")));
    } catch (Exception e) {
      return ResponseEntity.status(401).body(Map.of("error", "invalid_token"));
    }
  }

  private static String sha256Hex(String input) {
    try {
      var md = java.security.MessageDigest.getInstance("SHA-256");
      byte[] out = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(out);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
