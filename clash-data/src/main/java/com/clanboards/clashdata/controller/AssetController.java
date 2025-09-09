package com.clanboards.clashdata.controller;

import com.clanboards.clashdata.service.AssetService;
import java.net.URL;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clan-data/assets")
public class AssetController {

  private static final String ALLOWED_HOST = "api-assets.clashofclans.com";

  private final AssetService assetService;

  @Autowired
  public AssetController(AssetService assetService) {
    this.assetService = assetService;
  }

  @GetMapping
  public ResponseEntity<byte[]> getAsset(@RequestParam(required = false) String url) {
    // Validate URL parameter is present and not empty
    if (url == null || url.trim().isEmpty()) {
      return ResponseEntity.badRequest().build();
    }

    try {
      // Parse and validate the URL
      URL parsedUrl = new URL(url);
      String scheme = parsedUrl.getProtocol();
      String host = parsedUrl.getHost();

      // Validate scheme
      if (!scheme.equals("http") && !scheme.equals("https")) {
        return ResponseEntity.badRequest().build();
      }

      // Validate host
      if (!ALLOWED_HOST.equals(host)) {
        return ResponseEntity.badRequest().build();
      }

      // Fetch asset via service
      AssetService.AssetResponse assetResponse = assetService.getAsset(url);

      return ResponseEntity.ok()
          .header("Content-Type", assetResponse.contentType())
          .body(assetResponse.data());

    } catch (Exception e) {
      // Invalid URL or service error
      if (e instanceof java.net.MalformedURLException) {
        return ResponseEntity.badRequest().build();
      } else {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
      }
    }
  }
}
