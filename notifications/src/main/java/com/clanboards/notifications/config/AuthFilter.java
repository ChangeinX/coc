package com.clanboards.notifications.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.IOException;
import java.security.Principal;
import java.util.Base64;

@Component
public class AuthFilter extends OncePerRequestFilter {
    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        HttpServletRequest req = request;
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            String[] parts = token.split("\\.");
            if (parts.length > 1) {
                try {
                    String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                    JsonNode node = mapper.readTree(payload);
                    if (node.has("sub")) {
                        String sub = node.get("sub").asText();
                        request.setAttribute("sub", sub);
                        req = new HttpServletRequestWrapper(request) {
                            private final Principal principal = () -> sub;
                            @Override
                            public Principal getUserPrincipal() {
                                return principal;
                            }
                        };
                    }
                } catch (Exception ignored) {}
            }
        }
        filterChain.doFilter(req, response);
    }
}
