import type {Article} from '../types/article';

export function formatRelativeEnglish(timestampMs: number): string {
  if (!timestampMs || timestampMs <= 0) {
    return '';
  }
  const diff = Date.now() - timestampMs;
  if (diff < 45_000) {
    return 'just now';
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days < 30) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function formatArticleMetaLine(article: Article): string {
  const author = article.author?.trim();
  const nepali = article.publishedNepali?.trim();
  const ts = article.publishedAtMs ?? article.fetchedAt;
  const rel = formatRelativeEnglish(ts);

  const dateParts: string[] = [];
  if (nepali) {
    dateParts.push(nepali);
  }
  if (rel) {
    dateParts.push(rel);
  }
  const dateStr = dateParts.join(' · ');

  if (author && dateStr) {
    return `${author} • ${dateStr}`;
  }
  if (author) {
    return author;
  }
  return dateStr;
}
