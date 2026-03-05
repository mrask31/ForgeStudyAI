/**
 * LMS Adapters Export
 * 
 * Provides unified exports for Canvas and Google Classroom adapters.
 */

export {
  CanvasAdapter,
  CanvasAuthError,
  CanvasRateLimitError,
  CanvasNetworkError,
} from './CanvasAdapter';

export {
  GoogleClassroomAdapter,
  GoogleClassroomAuthError,
  GoogleClassroomRateLimitError,
  GoogleClassroomNetworkError,
} from './GoogleClassroomAdapter';
