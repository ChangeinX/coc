package com.clanboards.notifications.repository;

import com.clanboards.notifications.repository.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUserId(Long userId);
    PushSubscription findByEndpoint(String endpoint);
}
