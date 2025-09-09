package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.ClanSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClanSnapshotRepository extends JpaRepository<ClanSnapshot, Long> {

  ClanSnapshot findTopByClanTagOrderByTsDesc(String clanTag);
}
