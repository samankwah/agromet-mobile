export type NewsUpdate = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string; // ISO 8601
  category: 'programme' | 'news' | 'announcement';
  url?: string;
  imageUrl?: string;
};
