/**
 * AI-assisted homework verification types
 */

export interface HomeworkSession {
  sessionId: string;
  childId: string;
  familyId: string;
  startedAt: number;
  completedAt?: number;
  preImageUri: string; // Before-homework notebook image
  postImageUri: string; // After-homework notebook image
  status: 'IN_PROGRESS' | 'ANALYZING' | 'REVIEW_PENDING' | 'APPROVED' | 'REJECTED';
  analysis?: HomeworkAnalysis;
  parentReview?: ParentReview;
  earnedPoints?: number;
}

export interface HomeworkAnalysis {
  analysisId: string;
  sessionId: string;
  preImageOCRText: string;
  postImageOCRText: string;
  writingDensityDifference: number; // Percentage increase in written content (0-100)
  pageAlignment: 'SAME_PAGE' | 'DIFFERENT_PAGES' | 'UNCLEAR';
  completionEstimate: 'INCOMPLETE' | 'LIKELY_COMPLETE' | 'COMPLETE';
  confidenceScore: number; // 0-100, based on consistency
  duplicateImageDetected: boolean;
  generatedAt: number;
  model: string; // e.g., "gemini-2.5-flash"
}

export interface ParentReview {
  reviewId: string;
  sessionId: string;
  reviewedBy: string; // guardianId
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  feedback: string;
  pointsAwarded?: number;
  reviewedAt: number;
}

export interface HomeworkRule {
  ruleId: string;
  familyId: string;
  minSessionDuration: number; // minutes
  minWritingDensityIncrease: number; // percentage
  pointsForCompletion: number;
  autoApprovalThreshold: number; // confidence score 0-100, above this auto-approves
  active: boolean;
}

export interface HomeworkAnalysisResult {
  status: 'success' | 'error';
  confidence: number;
  completion: 'INCOMPLETE' | 'LIKELY_COMPLETE' | 'COMPLETE';
  writingDensityDifference: number;
  error?: string;
  aiExplanation: string; // Explainable AI reason for the decision
}
