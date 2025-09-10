package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.WarSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WarSnapshotRepository extends JpaRepository<WarSnapshot, Long> {

  WarSnapshot findTopByClanTagOrderByTsDesc(String clanTag);
}
