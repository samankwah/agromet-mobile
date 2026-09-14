/**
 * On-device cassava classification.
 *
 * `diagnoseOffline` is the whole public surface; useDiagnose.ts is its only
 * caller. Everything else here is reachable for tests, not for features.
 */
export { diagnoseOffline, isCropSupportedOffline, adaptPrediction } from './adapter';
export { classifyImage, loadClassifier, resetClassifierForTests } from './classifier';
export { preprocessImage } from './preprocess';
export { CASSAVA_CLASS_IDS, MIN_REPORTABLE_CONFIDENCE, MODEL_INPUT_SIZE } from './labels';
export type { CassavaClassId } from './labels';
export { CASSAVA_KNOWLEDGE_BASE } from './knowledgeBase';
