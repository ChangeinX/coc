package com.clanboards.clashdata.service;

import com.clanboards.CocClient;
import com.clanboards.auth.DevSiteAuthenticator;
import com.clanboards.http.DefaultHttpTransport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CocClientService {

  private static final Logger logger = LoggerFactory.getLogger(CocClientService.class);

  private final CocClient cocClient;

  public CocClientService(
      @Value("${COC_EMAIL:}") String cocEmail, @Value("${COC_PASSWORD:}") String cocPassword) {
    if (cocEmail == null || cocEmail.isEmpty() || cocPassword == null || cocPassword.isEmpty()) {
      throw new IllegalArgumentException(
          "COC_EMAIL and COC_PASSWORD environment variables are required");
    }
    DefaultHttpTransport transport = new DefaultHttpTransport();
    this.cocClient = new CocClient(transport, new DevSiteAuthenticator(transport));
    this.cocClient.login(cocEmail, cocPassword);
    logger.info("CocClient initialized and logged in successfully");
  }

  /**
   * Verify a player's API token via the Clash of Clans API.
   *
   * @param playerTag the player's tag
   * @param token the token to verify
   * @return true if the token is valid, false otherwise
   */
  public boolean verifyPlayerToken(String playerTag, String token) {
    try {
      logger.debug("Verifying player token for tag: {}", playerTag);
      boolean result = cocClient.verifyPlayerToken(playerTag, token);
      logger.debug("Token verification result for {}: {}", playerTag, result);
      return result;
    } catch (Exception e) {
      logger.error("Error verifying player token for {}: {}", playerTag, e.getMessage());
      return false;
    }
  }
}
