package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.PlayerSnapshot;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerSnapshotRepository extends JpaRepository<PlayerSnapshot, Long> {

  @Query(
      """
      SELECT ps FROM PlayerSnapshot ps
      WHERE ps.playerTag IN :playerTags
      AND ps.ts = (
        SELECT MAX(ps2.ts)
        FROM PlayerSnapshot ps2
        WHERE ps2.playerTag = ps.playerTag
      )
      """)
  List<PlayerSnapshot> findLatestSnapshotsByPlayerTags(
      @Param("playerTags") List<String> playerTags);

  List<PlayerSnapshot> findByPlayerTagAndTsAfterOrderByTsAsc(
      String playerTag, LocalDateTime cutoff);

  @Query(
      """
      SELECT ps FROM PlayerSnapshot ps
      WHERE ps.clanTag = :clanTag
      AND ps.ts = (
        SELECT MAX(ps2.ts)
        FROM PlayerSnapshot ps2
        WHERE ps2.playerTag = ps.playerTag
      )
      """)
  List<PlayerSnapshot> findLatestSnapshotsForClan(@Param("clanTag") String clanTag);
}
