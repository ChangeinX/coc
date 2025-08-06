package com.clanboards.recruiting.service;

import com.clanboards.recruiting.model.Clan;
import com.clanboards.recruiting.model.PlayerRecruitPost;
import com.clanboards.recruiting.model.RecruitJoin;
import com.clanboards.recruiting.model.RecruitPost;
import com.clanboards.recruiting.repository.ClanRepository;
import com.clanboards.recruiting.repository.PlayerRecruitPostRepository;
import com.clanboards.recruiting.repository.RecruitJoinRepository;
import com.clanboards.recruiting.repository.RecruitPostRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class RecruitService {
  private final RecruitPostRepository recruitRepo;
  private final PlayerRecruitPostRepository playerRepo;
  private final RecruitJoinRepository joinRepo;
  private final ClanRepository clanRepo;

  public RecruitService(
      RecruitPostRepository recruitRepo,
      PlayerRecruitPostRepository playerRepo,
      RecruitJoinRepository joinRepo,
      ClanRepository clanRepo) {
    this.recruitRepo = recruitRepo;
    this.playerRepo = playerRepo;
    this.joinRepo = joinRepo;
    this.clanRepo = clanRepo;
  }

  public List<Map<String, Object>> listRecruitPosts() {
    return recruitRepo.findAll().stream()
        .map(
            p -> {
              Map<String, Object> m = new java.util.HashMap<>();
              m.put("id", p.getId());
              m.put("clanTag", p.getClanTag());
              m.put("callToAction", p.getCallToAction());

              String normTag = normalizeTag(p.getClanTag());
              Clan clan = clanRepo.findById(normTag).orElse(null);
              if (clan != null) {
                Map<String, Object> clanMap = new java.util.HashMap<>();
                clanMap.put("tag", p.getClanTag());
                String deepLink = clan.getDeepLink();
                if (deepLink == null || deepLink.isBlank()) {
                  deepLink =
                      "https://link.clashofclans.com/?action=OpenClanProfile&tag=%23" + normTag;
                }
                clanMap.put("deep_link", deepLink);
                Map<String, Object> details = clan.getData();
                if (details != null) {
                  clanMap.putAll(details);
                }
                m.put("clan", clanMap);
              }

              return m;
            })
        .collect(Collectors.toList());
  }

  private static String normalizeTag(String tag) {
    return tag == null ? "" : tag.replace("#", "").toUpperCase();
  }

  public void createRecruitPost(String clanTag, String callToAction) {
    RecruitPost p = new RecruitPost();
    p.setClanTag(clanTag);
    p.setCallToAction(callToAction);
    p.setCreatedAt(Instant.now());
    recruitRepo.save(p);
  }

  public List<Map<String, Object>> listPlayerPosts() {
    return playerRepo.findAll().stream()
        .map(
            p -> {
              Map<String, Object> m = new java.util.HashMap<>();
              m.put("id", p.getId());
              m.put("description", p.getDescription());
              m.put("league", p.getLeague());
              m.put("language", p.getLanguage());
              m.put("war", p.getWar());
              return m;
            })
        .collect(Collectors.toList());
  }

  public void createPlayerPost(
      long userId, String description, String league, String language, String war) {
    PlayerRecruitPost p = new PlayerRecruitPost();
    p.setUserId(userId);
    p.setDescription(description);
    p.setLeague(league);
    p.setLanguage(language);
    p.setWar(war);
    p.setCreatedAt(Instant.now());
    playerRepo.save(p);
  }

  public void join(long postId, long userId) {
    if (!recruitRepo.existsById(postId)) {
      throw new NoSuchElementException();
    }
    RecruitJoin j = new RecruitJoin();
    j.setPostId(postId);
    j.setUserId(userId);
    j.setCreatedAt(Instant.now());
    joinRepo.save(j);
  }
}
