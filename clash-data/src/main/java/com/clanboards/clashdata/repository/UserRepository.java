package com.clanboards.clashdata.repository;

import com.clanboards.clashdata.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findBySub(String sub);

  @Query("SELECT u.playerTag FROM User u WHERE u.sub = :sub AND u.playerTag IS NOT NULL")
  Optional<String> findPlayerTagBySub(@Param("sub") String sub);
}