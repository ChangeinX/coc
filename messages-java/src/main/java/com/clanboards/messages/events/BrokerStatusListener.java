package com.clanboards.messages.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.broker.BrokerAvailabilityEvent;
import org.springframework.stereotype.Component;

/**
 * Logs broker availability changes so operations staff can track when the
 * in-memory STOMP broker goes down or comes back online.
 */
@Component
public class BrokerStatusListener {
    private static final Logger log = LoggerFactory.getLogger(BrokerStatusListener.class);

    @EventListener
    public void handleBrokerEvent(BrokerAvailabilityEvent event) {
        if (event.isBrokerAvailable()) {
            log.info("STOMP broker became available");
        } else {
            // include the event's string form which identifies the handler
            log.warn("STOMP broker became unavailable: {}", event.toString());
        }
    }
}
