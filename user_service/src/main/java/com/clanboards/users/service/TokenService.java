package com.clanboards.users.service;

import com.clanboards.users.config.KeyConfig.KeyHolder;
import com.clanboards.users.config.OidcProperties;
import com.clanboards.users.model.Session;
import com.clanboards.users.model.User;
import com.clanboards.users.repository.SessionRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.PrivateKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private final OidcProperties props;
  private final KeyHolder keys;
  private final SessionRepository sessions;

  public record IssueResult(String accessToken, String idToken, String refreshToken, long expiresInSeconds, Long sessionId) {}
  public record TokenPair(String accessToken, String idToken, long expiresInSeconds) {}

  public TokenService(OidcProperties props, KeyHolder keys, SessionRepository sessions) {
    this.props = props; this.keys = keys; this.sessions = sessions;
  }

  private String sign(Map<String, Object> claims, Instant exp) {
    PrivateKey pk = keys.getPrivateKey();
    var builder = Jwts.builder();
    builder.setHeaderParam("kid", keys.getKid());
    builder.setClaims(claims);
    builder.setExpiration(Date.from(exp));
    return builder.signWith(pk, SignatureAlgorithm.RS256).compact();
  }

  public TokenPair issueAccessAndId(User user, Long sessionId) {
    Instant now = Instant.now();
    Instant accessExp = now.plus(props.getAccessTtl());
    Instant idExp = now.plus(props.getIdTtl());
    String sub = Objects.requireNonNullElse(user.getSub(), String.valueOf(user.getId()));

    Map<String, Object> base = Map.of(
        "iss", props.getIssuer(),
        "aud", props.getAudience(),
        "sub", sub,
        "iat", Date.from(now));

    var accessClaims = new java.util.HashMap<String, Object>(base);
    if (sessionId != null) accessClaims.put("sid", sessionId);
    String access = sign(accessClaims, accessExp);

    var idClaims = new java.util.HashMap<String, Object>(base);
    String idt = sign(idClaims, idExp);
    long expiresIn = props.getAccessTtl().toSeconds();
    return new TokenPair(access, idt, expiresIn);
  }

  public IssueResult issueAll(User user, String ua, String ip) {
    // Create refresh session
    String refresh = generateRefreshToken();
    String hash = sha256Hex(refresh);
    Session sess = new Session();
    sess.setUserId(user.getId());
    sess.setRefreshTokenHash(hash);
    sess.setCreatedAt(Instant.now());
    sess.setExpiresAt(Instant.now().plus(props.getRefreshTtl()));
    sess.setIp(ip);
    sess.setUserAgent(ua);
    sessions.save(sess);

    TokenPair pair = issueAccessAndId(user, sess.getId());
    return new IssueResult(pair.accessToken(), pair.idToken(), refresh, pair.expiresInSeconds(), sess.getId());
  }

  public TokenPair refreshFromToken(String refreshToken, User user) {
    String hash = sha256Hex(refreshToken);
    var sessOpt = sessions.findByRefreshTokenHash(hash);
    var sess = sessOpt.orElseThrow(() -> new IllegalArgumentException("invalid_refresh_token"));
    if (sess.getExpiresAt() == null || sess.getExpiresAt().isBefore(Instant.now())) {
      throw new IllegalStateException("refresh_expired");
    }
    // For now, do not rotate refresh token; just issue new access/id
    return issueAccessAndId(user, sess.getId());
  }

  public void revoke(String refreshToken) {
    String hash = sha256Hex(refreshToken);
    sessions.findByRefreshTokenHash(hash).ifPresent(s -> sessions.deleteById(s.getId()));
  }

  private static String generateRefreshToken() {
    byte[] buf = new byte[32]; // 256-bit
    new Random().nextBytes(buf);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
  }

  private static String sha256Hex(String input) {
    try {
      var md = java.security.MessageDigest.getInstance("SHA-256");
      byte[] out = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(out);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}

