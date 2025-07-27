package com.clanboards.notifications;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import java.security.Security;

@SpringBootApplication
public class NotificationsApplication {
    public static void main(String[] args) {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        SpringApplication.run(NotificationsApplication.class, args);
    }
}
