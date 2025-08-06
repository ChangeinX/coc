package com.clanboards.recruiting.controller;

import com.clanboards.recruiting.service.RecruitService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recruiting")
public class RecruitController {
  private final RecruitService recruitService;

  public RecruitController(RecruitService recruitService) {
    this.recruitService = recruitService;
  }

  @GetMapping("/recruit")
  public Map<String, Object> listRecruit() {
    Map<String, Object> resp = new java.util.HashMap<>();
    resp.put("items", recruitService.listRecruitPosts());
    resp.put("nextCursor", null);
    return resp;
  }

  @PostMapping("/recruit")
  @ResponseStatus(HttpStatus.CREATED)
  public void createRecruit(@RequestBody Map<String, String> payload) {
    recruitService.createRecruitPost(payload.get("clanTag"), payload.get("callToAction"));
  }

  @GetMapping("/player-recruit")
  public Map<String, Object> listPlayerRecruit() {
    Map<String, Object> resp = new java.util.HashMap<>();
    resp.put("items", recruitService.listPlayerPosts());
    resp.put("nextCursor", null);
    return resp;
  }

  @PostMapping("/player-recruit")
  @ResponseStatus(HttpStatus.CREATED)
  public void createPlayerRecruit(
      HttpServletRequest request, Principal principal, @RequestBody Map<String, String> payload) {
    long userId = parseUserId(request, principal);
    recruitService.createPlayerPost(
        userId,
        payload.get("description"),
        payload.get("league"),
        payload.get("language"),
        payload.get("war"));
  }

  @PostMapping("/join/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void join(@PathVariable long id, HttpServletRequest request, Principal principal) {
    long userId = parseUserId(request, principal);
    recruitService.join(id, userId);
  }

  private long parseUserId(HttpServletRequest request, Principal principal) {
    String name = null;
    if (principal != null) {
      name = principal.getName();
    }
    if (name == null) {
      Object sub = request.getAttribute("sub");
      if (sub instanceof String s) {
        name = s;
      }
    }
    if (name == null) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED);
    }
    try {
      return Long.parseLong(name);
    } catch (NumberFormatException e) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED);
    }
  }
}
