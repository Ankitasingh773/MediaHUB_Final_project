export type ContentType = 'Video' | 'Image' | 'Article' | 'Movie';
export const CONTENT_TYPES: ContentType[] = ['Video', 'Image', 'Article', 'Movie'];
export type ContentStatus = 'Draft' | 'UnderReview' | 'Published' | 'Archived' | 'Removed';
export type CreatorStatus = 'Active' | 'Suspended' | 'PendingReview';

export interface ContentAsset {
  contentId: number;
  creatorId: number;
  title: string;
  type: ContentType;
  genre?: string;
  language?: string;
  durationSeconds?: number;
  synopsis?: string;
  filePath?: string;
  thumbnailPath?: string;
  status: ContentStatus;
  /** Frontend-only field (not in the real ContentAsset entity yet) — set when status transitions
   *  to Published. Backend would need to add this column to persist it for real. */
  publishedDate?: string;
}

export interface ContentTag {
  tagId: number;
  contentId: number;
  tagName: string;
  tagCategory: 'Genre' | 'Mood' | 'Theme' | 'AgeRating';
}

export interface Creator {
  creatorId: number;
  userId: number;
  displayName: string;
  genre?: string;
  country?: string;
  royaltyTier?: string;
  bankAccountRef?: string;
  status: CreatorStatus;
}
