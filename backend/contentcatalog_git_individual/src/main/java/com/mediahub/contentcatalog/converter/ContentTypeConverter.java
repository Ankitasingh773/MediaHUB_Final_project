package com.mediahub.contentcatalog.converter;

import com.mediahub.contentcatalog.enums.ContentType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Null-tolerant persistence mapping for {@link ContentType}. A legacy or unexpected value in the
 * content_asset.type column (e.g. a type that predates its addition to the enum) maps to null
 * instead of throwing, so a single unrecognized row can no longer fail the entire fetchContents
 * query. Matching is case-insensitive to tolerate rows inserted as VIDEO / video etc.
 */
@Converter(autoApply = false)
public class ContentTypeConverter implements AttributeConverter<ContentType, String> {

    @Override
    public String convertToDatabaseColumn(ContentType attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public ContentType convertToEntityAttribute(String dbValue) {
        if (dbValue == null || dbValue.isBlank()) {
            return null;
        }
        for (ContentType t : ContentType.values()) {
            if (t.name().equalsIgnoreCase(dbValue)) {
                return t;
            }
        }
        return null; // unknown legacy value — degrade gracefully instead of 500-ing the list
    }
}
