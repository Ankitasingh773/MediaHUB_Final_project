package com.mediahub.licensing.executor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class ContentValidationExecutor {

    @Autowired
    private WebClient webClient;

    public Boolean validateContent(Integer contentId) {

        String authHeader = currentAuthorizationHeader();

        return webClient.get()
                .uri("http://localhost:8093/mediahub/contentCatalog/contentAsset/validateContent/"
                        + contentId)
                .headers(h -> {
                    if (authHeader != null && !authHeader.isBlank()) {
                        h.set(HttpHeaders.AUTHORIZATION, authHeader);
                    }
                })
                .retrieve()
                .bodyToMono(Boolean.class)
                .block();
    }

    private String currentAuthorizationHeader() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            return attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
