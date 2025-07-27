package com.clanboards.notifications.config;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import java.security.Security;

@Configuration
public class BouncyCastleConfig {
    @PostConstruct
    public void registerProvider() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }
}
