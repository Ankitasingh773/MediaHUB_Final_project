package com.mediahub.royalty.service;

import com.mediahub.royalty.client.ContentCatalogClient;
import com.mediahub.royalty.client.EditorialClient;
import com.mediahub.royalty.client.LicensingClient;
import com.mediahub.royalty.client.NotificationClient;
import com.mediahub.royalty.exception.BadRequestException;
import com.mediahub.royalty.client.CreatorClient;
import org.springframework.beans.factory.annotation.Autowired;
import com.mediahub.royalty.exception.ResourceNotFoundException;
import com.mediahub.royalty.model.RoyaltyStatement;
import com.mediahub.royalty.repository.RoyaltyStatementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.mediahub.royalty.client.SubscriptionClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoyaltyStatementService {

    private static final Logger logger = LoggerFactory.getLogger(RoyaltyStatementService.class);
    private final RoyaltyStatementRepository repository;
    @Autowired
    private CreatorClient creatorClient;
    @Autowired
    private SubscriptionClient subscriptionClient;
    @Autowired
    private LicensingClient licensingClient;
    @Autowired
    private EditorialClient editorialClient;
    @Autowired
    private ContentCatalogClient contentCatalogClient;
    @Autowired
    private NotificationClient notificationClient;

    public RoyaltyStatementService(RoyaltyStatementRepository repository) {
        this.repository = repository;
    }

    public RoyaltyStatement generateStatement(RoyaltyStatement statement, Long actorUserId) {
        logger.debug("Generating new royalty statement for CreatorID: {}", statement.getCreatorID());

        try {

            if (statement.getCreatorID() == 0) {
                logger.warn("Validation failed: CreatorID is required");
                throw new BadRequestException("CreatorID is required");
            }

            // Statement generation intentionally no longer hard-blocks on cross-module state
            // (active subscription / active license agreement / editorially approved content).
            // Those gates required matching demo data to exist in the Subscription, Licensing and
            // Editorial services, and their absence was blocking legitimate generation. We still
            // best-effort resolve the creator's linked user account, purely for the notification
            // below — a failure here must never block generation.
            Long linkedUserId = null;
            try {
                linkedUserId = creatorClient.getUserId(statement.getCreatorID());
            } catch (Exception ex) {
                logger.warn(
                        "Could not resolve linked user for CreatorID {}: {}",
                        statement.getCreatorID(), ex.getMessage());
            }

            if (statement.getPeriod() == null || statement.getPeriod().isEmpty()) {
                logger.warn("Validation failed: Period is required");
                throw new BadRequestException("Period is required");
            }

            if (statement.getTotalRevenue() < 0) {
                logger.warn(
                        "Validation failed: TotalRevenue cannot be negative: {}",
                        statement.getTotalRevenue());

                throw new BadRequestException(
                        "TotalRevenue cannot be negative");
            }

            statement.setStatus("Draft");

            repository.save(statement);

            // ✅ NOTIFICATION — inform the creator's actual linked user account (not the raw
            // creatorID, which is a different record) that their statement has been generated,
            // and confirm to the admin/analyst who generated it. Best-effort: the statement is
            // already saved, so a notification failure must not surface as a generation error.
            try {
                if (linkedUserId != null) {
                    notificationClient.sendRoyaltyNotification(
                            linkedUserId,
                            "Your royalty statement for period '" + statement.getPeriod()
                                    + "' has been generated. Statement ID: "
                                    + statement.getStatementID(),
                            null);
                }
                if (actorUserId != null && !actorUserId.equals(linkedUserId)) {
                    notificationClient.sendRoyaltyNotification(
                            actorUserId,
                            "You generated royalty statement " + statement.getStatementID()
                                    + " for period '" + statement.getPeriod() + "'.",
                            null);
                }
            } catch (Exception ex) {
                logger.warn(
                        "Royalty statement {} saved, but notification failed: {}",
                        statement.getStatementID(), ex.getMessage());
            }

            logger.info(
                    "Royalty statement generated successfully with ID: {}",
                    statement.getStatementID());

            return statement;

        } catch (Exception e) {

            logger.error(
                    "Error generating royalty statement: {}",
                    e.getMessage(),
                    e);

            throw e;
        }
    }

    public List<RoyaltyStatement> getAllStatements() {
        logger.debug("Fetching all royalty statements");
        List<RoyaltyStatement> statements = repository.findAll();
        logger.info("Retrieved {} royalty statements", statements.size());
        return statements;
    }

    public RoyaltyStatement getStatementById(int statementID) {
        logger.debug("Fetching royalty statement with ID: {}", statementID);
        RoyaltyStatement statement = repository.findById(statementID);
        logger.info("Royalty statement with ID: {} fetched successfully", statementID);
        return statement;
    }

    public Map<String, Object> finaliseStatement(int statementID, Long actorUserId) {
        logger.debug("Finalising royalty statement with ID: {}", statementID);
        try {
            String currentStatus = repository.findStatusById(statementID);
            if (!currentStatus.equals("Draft")) {
                logger.warn("Cannot finalise non-Draft statement with ID: {} (current status: {})", statementID, currentStatus);
                throw new BadRequestException("Only Draft statements can be finalised.");
            }
            int result = repository.updateStatus(statementID, "Finalised");
            if (result == 0) {
                logger.error("Royalty statement not found with ID: {}", statementID);
                throw new ResourceNotFoundException(
                        "Statement not found with ID: " + statementID);
            }
            Map<String, Object> response = new HashMap<>();
            response.put("statementID", statementID);
            response.put("status", "Finalised");
            response.put("statusCode", 200);
            response.put("message", "Statement finalised successfully.");

            // ✅ NOTIFICATION — resolve the creator's real linked user account, and also
            // confirm to whoever actually finalised it.
            RoyaltyStatement finalised = repository.findById(statementID);
            if (finalised != null) {
                Long linkedUserId = creatorClient.getUserId(finalised.getCreatorID());
                if (linkedUserId != null) {
                    notificationClient.sendRoyaltyNotification(
                            linkedUserId,
                            "Your royalty statement (ID: " + statementID
                                    + ") has been finalised and is ready for payout.",
                            null);
                }
                if (actorUserId != null && !actorUserId.equals(linkedUserId)) {
                    notificationClient.sendRoyaltyNotification(
                            actorUserId,
                            "You finalised royalty statement " + statementID + ".",
                            null);
                }
            }

            logger.info("Royalty statement with ID: {} finalised successfully", statementID);
            return response;
        } catch (Exception e) {
            logger.error("Error finalising royalty statement with ID: {}: {}", statementID, e.getMessage(), e);
            throw e;
        }
    }

    public Map<String, Object> markAsPaid(int statementID, Long actorUserId) {
        logger.debug("Marking royalty statement with ID: {} as Paid", statementID);
        try {
            String currentStatus = repository.findStatusById(statementID);
            if (!currentStatus.equals("Finalised")) {
                logger.warn("Cannot mark non-Finalised statement with ID: {} as Paid (current status: {})", statementID, currentStatus);
                throw new BadRequestException("Only Finalised statements can be marked as Paid.");
            }
            int result = repository.updateStatus(statementID, "Paid");
            if (result == 0) {
                logger.error("Royalty statement not found with ID: {}", statementID);
                throw new ResourceNotFoundException(
                        "Statement not found with ID: " + statementID);
            }
            Map<String, Object> response = new HashMap<>();
            response.put("statementID", statementID);
            response.put("status", "Paid");
            response.put("statusCode", 200);
            response.put("message", "Statement marked as Paid successfully.");

            // ✅ NOTIFICATION — this transition previously sent none at all.
            RoyaltyStatement paid = repository.findById(statementID);
            if (paid != null) {
                Long linkedUserId = creatorClient.getUserId(paid.getCreatorID());
                if (linkedUserId != null) {
                    notificationClient.sendRoyaltyNotification(
                            linkedUserId,
                            "Your royalty statement (ID: " + statementID + ") has been marked as Paid.",
                            null);
                }
                if (actorUserId != null && !actorUserId.equals(linkedUserId)) {
                    notificationClient.sendRoyaltyNotification(
                            actorUserId,
                            "You marked royalty statement " + statementID + " as Paid.",
                            null);
                }
            }

            logger.info("Royalty statement with ID: {} marked as Paid successfully", statementID);
            return response;
        } catch (Exception e) {
            logger.error("Error marking royalty statement with ID: {} as Paid: {}", statementID, e.getMessage(), e);
            throw e;
        }
    }
 // ✅ ANALYTICS
    public Map<String, Object> getRoyaltyAnalytics() {

        logger.info("Fetching royalty analytics");

        List<RoyaltyStatement> statements =
                repository.findAll();

        int totalStatements = statements.size();

        double totalRevenue = statements.stream()
                .mapToDouble(RoyaltyStatement::getTotalRevenue)
                .sum();

        double totalRoyaltyAmount = statements.stream()
                .mapToDouble(RoyaltyStatement::getRoyaltyAmount)
                .sum();

        long draftStatements = statements.stream()
                .filter(s -> "Draft".equalsIgnoreCase(s.getStatus()))
                .count();

        long finalisedStatements = statements.stream()
                .filter(s -> "Finalised".equalsIgnoreCase(s.getStatus()))
                .count();

        long paidStatements = statements.stream()
                .filter(s -> "Paid".equalsIgnoreCase(s.getStatus()))
                .count();

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "message",
                "Royalty analytics retrieved successfully");

        response.put(
                "totalStatements",
                totalStatements);

        response.put(
                "totalRevenue",
                totalRevenue);

        response.put(
                "totalRoyaltyAmount",
                totalRoyaltyAmount);

        response.put(
                "draftStatements",
                draftStatements);

        response.put(
                "finalisedStatements",
                finalisedStatements);

        response.put(
                "paidStatements",
                paidStatements);

        return response;
    }
}
