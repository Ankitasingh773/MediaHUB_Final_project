package com.mediahub.contentcatalog.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "creator")
public class Creator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "creatorId")
    private int creatorId;

    @Column(name = "userId", nullable = false)
    private Long userId;

    @Column(name = "displayName", nullable = false)
    private String displayName;

    @Column(name = "genre")
    private String genre;

    @Column(name = "country")
    private String country;

    @Column(name = "royaltyTier")
    private String royaltyTier;

    @Column(name = "bankAccountRef")
    private String bankAccountRef;

    @Column(name = "status")
    private String status;

    public int getCreatorId() { return creatorId; }
    public void setCreatorId(int creatorId) { this.creatorId = creatorId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getRoyaltyTier() { return royaltyTier; }
    public void setRoyaltyTier(String royaltyTier) { this.royaltyTier = royaltyTier; }

    public String getBankAccountRef() { return bankAccountRef; }
    public void setBankAccountRef(String bankAccountRef) { this.bankAccountRef = bankAccountRef; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}