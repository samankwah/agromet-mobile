import { getLatestNews } from '../data/mockNews';
import type { NewsUpdate } from '../domain/news';
import { mockDelay } from './mockDelay';

export async function getLatestNewsTeaser(): Promise<NewsUpdate> {
  return mockDelay(getLatestNews());
}
