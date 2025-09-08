package com.clanboards.users.repository;

import com.clanboards.users.model.FeatureFlag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, Long> {
  List<FeatureFlag> findByNameIn(List<String> names);
}
