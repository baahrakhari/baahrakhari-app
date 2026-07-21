/**
 * Parsed in-app content for the site's "हाम्रो बारेमा" (About) and
 * "हाम्रो टिम" (Team) pages. These are cached locally so the user can
 * read them fully offline.
 */
export type AboutContent = {
  url: string;
  /** Heading shown above the paragraphs (typically "हाम्रो बारेमा"). */
  heading: string;
  paragraphs: string[];
  fetchedAt: number;
};

export type TeamMember = {
  name: string;
  role: string;
  imageUrl?: string;
};

export type TeamCategory = {
  title: string;
  members: TeamMember[];
};

export type TeamContent = {
  url: string;
  heading: string;
  categories: TeamCategory[];
  fetchedAt: number;
};

export type InfoPageKey = 'about' | 'team';
