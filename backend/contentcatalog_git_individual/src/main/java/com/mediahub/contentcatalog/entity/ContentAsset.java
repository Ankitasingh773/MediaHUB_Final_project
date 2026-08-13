package com.mediahub.contentcatalog.entity;

import com.mediahub.contentcatalog.converter.ContentTypeConverter;
import com.mediahub.contentcatalog.enums.ContentType;
import jakarta.persistence.*;

@Entity
@Table(name = "content_asset")
public class ContentAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contentId")
    private int contentId;

    @Column(name = "creatorId")
    private int creatorId;

    @Column(name = "title", nullable = false)
    private String title;

    @Convert(converter = ContentTypeConverter.class)
    @Column(name = "type")
    private ContentType type;

    @Column(name = "genre")
    private String genre;

    @Column(name = "language")
    private String language;

    @Column(name = "durationSeconds")
    private int durationSeconds;

    @Column(name = "synopsis")
    private String synopsis;

    @Column(name = "filePath")
    private String filePath;

    @Column(name = "thumbnailPath")
    private String thumbnailPath;

    @Column(name = "status")
    private String status;

    public int getContentId() { return contentId; }
    public void setContentId(int contentId) { this.contentId = contentId; }

    public int getCreatorId() { return creatorId; }
    public void setCreatorId(int creatorId) { this.creatorId = creatorId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public ContentType getType() { return type; }
    public void setType(ContentType type) { this.type = type; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }

    public String getSynopsis() { return synopsis; }
    public void setSynopsis(String synopsis) { this.synopsis = synopsis; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getThumbnailPath() { return thumbnailPath; }
    public void setThumbnailPath(String thumbnailPath) { this.thumbnailPath = thumbnailPath; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}