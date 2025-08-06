package com.clanboards.recruiting.service;

import com.clanboards.recruiting.model.PlayerRecruitPost;
import com.clanboards.recruiting.model.RecruitJoin;
import com.clanboards.recruiting.model.RecruitPost;
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

  public RecruitService(
      RecruitPostRepository recruitRepo,
      PlayerRecruitPostRepository playerRepo,
      RecruitJoinRepository joinRepo) {
    this.recruitRepo = recruitRepo;
    this.playerRepo = playerRepo;
    this.joinRepo = joinRepo;
  }

  public List<Map<String, Object>> listRecruitPosts() {
    return recruitRepo.findAll().stream()
        .map(
            p -> {
              Map<String, Object> m = new java.util.HashMap<>();
              m.put("id", p.getId());
              m.put("clanTag", p.getClanTag());
              m.put("callToAction", p.getCallToAction());
              return m;
            })
        .collect(Collectors.toList());
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
