package com.clanboards.users.controller;

import com.clanboards.users.model.User;
import com.clanboards.users.repository.UserRepository;
import com.clanboards.users.service.AccountLinkingService;
import com.clanboards.users.service.AppleTokenVerifier;
import com.clanboards.users.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class AppleAuthController {
  public record ExchangeRequest(String id_token) {}

  private final AppleTokenVerifier verifier;
  private final UserRepository users;
  private final TokenService tokens;
  private final AccountLinkingService accountLinking;

  public AppleAuthController(
      AppleTokenVerifier verifier,
      UserRepository users,
      TokenService tokens,
      AccountLinkingService accountLinking) {
    this.verifier = verifier;
    this.users = users;
    this.tokens = tokens;
    this.accountLinking = accountLinking;
  }

  @PostMapping("/auth/apple/exchange")
  public ResponseEntity<?> exchange(
      @RequestBody ExchangeRequest req,
      @RequestHeader(value = "User-Agent", required = false) String ua,
      @RequestHeader(value = "X-Forwarded-For", required = false) String ip,
      HttpServletRequest httpReq) {
    try {
      var ident = verifier.verify(req.id_token());
      // Use account linking service to handle email-based account linking
      var linkingResult = accountLinking.findOrCreateUser(ident.sub, ident.email, ident.email);
      User user = linkingResult.getUser();

      var res = tokens.issueAll(user, ua, ip);
      return ResponseEntity.ok(
          Map.of(
              "access_token", res.accessToken(),
              "id_token", res.idToken(),
              "refresh_token", res.refreshToken(),
              "token_type", "Bearer",
              "expires_in", res.expiresInSeconds(),
              "sid", res.sessionId()));
    } catch (Exception e) {
      return ResponseEntity.status(401)
          .body(Map.of("error", "invalid_grant", "error_description", e.getMessage()));
    }
  }

  // For future web flows (Android). Accepts id_token from Apple and deep-links back to app.
  @GetMapping("/auth/apple/callback")
  public ResponseEntity<?> webCallback(
      @RequestParam(name = "id_token", required = false) String idToken,
      @RequestParam(name = "state", required = false) String state) {
    String schemeRedirect = "clanboards://oauthredirect";
    try {
      if (idToken == null || idToken.isBlank())
        throw new IllegalArgumentException("missing_id_token");
      var ident = verifier.verify(idToken);
      // no session issuing here; mobile will exchange separately if needed
      String loc =
          schemeRedirect
              + "?status=success&sub="
              + java.net.URLEncoder.encode(ident.sub, java.nio.charset.StandardCharsets.UTF_8)
              + (state != null
                  ? "&state="
                      + java.net.URLEncoder.encode(state, java.nio.charset.StandardCharsets.UTF_8)
                  : "");
      HttpHeaders headers = new HttpHeaders();
      headers.add("Location", loc);
      return new ResponseEntity<>(headers, HttpStatus.FOUND);
    } catch (Exception e) {
      HttpHeaders headers = new HttpHeaders();
      headers.add("Location", schemeRedirect + "?status=error");
      return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
  }
}
