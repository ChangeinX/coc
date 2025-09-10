package com.clanboards.clashdata.service;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import com.clanboards.clashdata.repository.PlayerSnapshotRepository;
import com.clanboards.clashdata.util.TagUtils;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PlayerSnapshotService {

  private final PlayerSnapshotRepository playerSnapshotRepository;

  @Autowired
  public PlayerSnapshotService(PlayerSnapshotRepository playerSnapshotRepository) {
    this.playerSnapshotRepository = playerSnapshotRepository;
  }

  public List<PlayerSnapshot> getPlayerHistory(String playerTag) {
    return getPlayerHistory(playerTag, 30);
  }

  public List<PlayerSnapshot> getPlayerHistory(String playerTag, int days) {
    String normalizedPlayerTag = TagUtils.normalizeTag(playerTag);
    if (!normalizedPlayerTag.startsWith("#")) {
      normalizedPlayerTag = "#" + normalizedPlayerTag;
    }

    LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
    return playerSnapshotRepository.findByPlayerTagAndTsAfterOrderByTsAsc(
        normalizedPlayerTag, cutoff);
  }

  public List<PlayerSnapshot> getLatestSnapshotsForClan(String clanTag) {
    String normalizedClanTag = TagUtils.normalizeTag(clanTag);
    return playerSnapshotRepository.findLatestSnapshotsForClan(normalizedClanTag);
  }
}
