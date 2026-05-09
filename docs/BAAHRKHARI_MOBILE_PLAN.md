# Baahrakhari Mobile Build Plan

This document tracks execution of the Baahrakhari React Native app roadmap.

## Scope

- Build a React Native app for `baahrakhari.com`
- Scrape Nepali news data: title, author, image, body text
- Maintain in-app buffer with preloaded articles (target 10-15)
- Top 20% carousel area, bottom article area
- Horizontal swipe article navigation
- Category row with Home (all/latest feed) + categories
- Read mode with font size controls and read-later toggle
- Website-aligned theme colors

## Phase Tracker

### Phase 1 - Core Feed + Scrape Buffer

- [x] Add tracked implementation doc
- [x] Add site config + categories
- [x] Add scraper for listing + detail pages
- [x] Add article buffer hook (10-15 warm articles)
- [x] Build top categories row with Home icon
- [x] Build 20/80 article layout with horizontal swipe
- [x] Wire initial error/loading states
- [x] Run tests/lint
- [x] Run Android emulator
- [ ] Run iOS simulator

### Phase 2 - Read View and Typography

- [ ] Create READ modal/screen with focus mode
- [ ] Add text size controls and persist preference
- [ ] Return-to-feed and preserve previous context
- [ ] Add close animation and auto-advance to next article

### Phase 3 - Read Later

- [ ] Add paper icon toggle state
- [ ] Dark when selected, white when unselected
- [ ] Persist read-later list
- [ ] Add saved list entry screen/modal

### Phase 4 - Robustness and UX Polish

- [ ] Parser resiliency hardening and fallback selectors
- [ ] Background refresh and stale cache policy
- [ ] Image performance and graceful placeholders
- [ ] Accessibility labels (Nepali)
- [ ] Final QA on Android + iOS

## Notes

- Buffer target: prefetch first 12-15 detail pages per selected category.
- Initial Home mapping uses latest feed endpoint unless a dedicated all-news endpoint is provided.
- iOS run is currently blocked on this machine until full Xcode is selected (`xcodebuild` unavailable under CommandLineTools-only setup).
