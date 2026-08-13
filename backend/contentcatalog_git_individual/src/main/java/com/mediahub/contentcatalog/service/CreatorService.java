package com.mediahub.contentcatalog.service;

import com.mediahub.contentcatalog.entity.Creator;
import com.mediahub.contentcatalog.repository.CreatorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Service
public class CreatorService {

    // ✅ Logger added
    private static final Logger logger = LoggerFactory.getLogger(CreatorService.class);

    @Autowired
    CreatorRepository creatorRepository;

    // ✅ CREATE
    public String createCreator(Creator creator) {
        if (creator == null) {
            logger.error("createCreator called with null creator");
            throw new IllegalArgumentException("Creator request body is null");
        }

        if (creator.getUserId() == null) {
            logger.error("createCreator called with null userId");
            throw new IllegalArgumentException("userId is required");
        }

        // A single user may back multiple creator profiles, so we intentionally do NOT reject a
        // userId that is already linked to another creator.
        logger.info("Creating creator for userId: {}", creator.getUserId());

        if (creator.getStatus() == null) {
            creator.setStatus("PendingReview");
        }

        try {
            creatorRepository.save(creator);
        } catch (Exception e) {
            logger.error("Failed to save creator for userId: {}", creator.getUserId(), e);
            throw e;
        }

        logger.info("Creator created successfully for userId: {}", creator.getUserId());
        return "Creator created successfully";
    }

    // ✅ GET ALL
    public List<Creator> getAllCreators() {
        logger.info("Fetching all creators");
        return creatorRepository.findAll();
    }

    // ✅ GET BY ID
    public Creator getCreatorById(int creatorId) {
        logger.info("Fetching creator with ID: {}", creatorId);

        Creator creator = creatorRepository.findById(creatorId).orElse(null);

        if (creator == null) {
            logger.error("Creator not found with ID: {}", creatorId);
        }

        return creator;
    }

    // ✅ UPDATE CREATOR
    public String updateCreator(int creatorId, Creator creator) {
        logger.info("Updating creator with ID: {}", creatorId);

        Creator existing = creatorRepository.findById(creatorId).orElse(null);

        if (existing == null) {
            logger.error("Creator not found with ID: {}", creatorId);
            return "Creator not found";
        }

        existing.setDisplayName(creator.getDisplayName());
        existing.setGenre(creator.getGenre());
        existing.setCountry(creator.getCountry());
        existing.setRoyaltyTier(creator.getRoyaltyTier());
        existing.setBankAccountRef(creator.getBankAccountRef());

        creatorRepository.save(existing);

        logger.info("Creator updated successfully with ID: {}", creatorId);
        return "Creator updated successfully";
    }

    // ✅ UPDATE STATUS
    public String updateCreatorStatus(int creatorId, String status) {
        logger.info("Updating creator status for ID: {} to {}", creatorId, status);

        Creator existing = creatorRepository.findById(creatorId).orElse(null);

        if (existing == null) {
            logger.error("Creator not found with ID: {}", creatorId);
            return "Creator not found";
        }

        existing.setStatus(status);
        creatorRepository.save(existing);

        logger.info("Creator status updated successfully for ID: {}", creatorId);
        return "Status updated successfully";
    }
}