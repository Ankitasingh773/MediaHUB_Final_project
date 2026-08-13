package com.mediahub.licensing.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuditClient {

    private static final Logger logger = LoggerFactory.getLogger(AuditClient.class);

    @Autowired
    private WebClient webClient;

    @Value("${audit.service.url:http://localhost:8091}")
    private String auditServiceUrl;

    public void log(String eventType, String moduleSource, Long performedBy, String performedByRole,
                     String targetEntityType, String targetEntityId, String description, String severity) {
        Map<String, Object> body = new HashMap<>();
        body.put("eventType", eventType);
        body.put("moduleSource", moduleSource);
        body.put("performedBy", performedBy);
        body.put("performedByRole", performedByRole);
        body.put("targetEntityType", targetEntityType);
        body.put("targetEntityId", targetEntityId);
        body.put("description", description);
        body.put("severity", severity);
        body.put("ipAddress", resolveClientIp());

        webClient.post()
                .uri(auditServiceUrl + "/mediaHub/auditlog/events/logEvent/v1.0")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .subscribe(
                    response -> logger.debug("Audit event recorded: {}", eventType),
                    error -> logger.error("Failed to record audit event type={} entity={}/{}: {}",
                        eventType, targetEntityType, targetEntityId, error.getMessage()));
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest req = attrs.getRequest();
            String forwarded = req.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
            return normalizeLoopback(req.getRemoteAddr());
        } catch (IllegalStateException e) {
            return null;
        }
    }

    private String normalizeLoopback(String ip) {
        return ("0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip)) ? "127.0.0.1" : ip;
    }
}
