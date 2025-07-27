package com.clanboards.notifications.repository;

import com.clanboards.notifications.repository.entity.PushSubscription;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
  List<PushSubscription> findByUserId(Long userId);

  PushSubscription findByEndpoint(String endpoint);
}
