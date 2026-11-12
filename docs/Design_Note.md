# Design note: working with national youth platforms, not competing

The brief requires this note. **Decision:** AgriOpportunity is a narrow agricultural view on top of existing national services, not a replacement for them.

## The problem with competing

South African youth already use national platforms that list jobs, learnerships and bursaries across all sectors. A new standalone portal would split listings further, and young people with little data would have to check one more place. That is the exact problem the brief describes.

## How AgriOpportunity fits in

| Concern | Our design |
|---|---|
| Where listings come from | MVP 1: admins add agri-specific items. Next: an **import endpoint** pulls listings from the national platform's feed, keeping each record's source and id so re-imports update instead of duplicating. |
| Where people apply | We **send people to the original application** (`applyMethod: link`). The in-app form is only for small agri programmes that have no application system of their own. |
| What we add | An agriculture-specific profile (field, province, NQF level), explainable matching, closing-date reminders and an offline saved list. These are the parts a general platform does not do for this sector. |
| Credit to the source | Imported listings will show "Listed by <source>" in the app. |
| Giving back | Our search API (`GET /api/v1/opportunities`) is public, so a national platform or MyAgriSETA can already read our agri-only listings. |
| Identity | Designed to swap our JWT for the shared AgriConnect identity, and later for single sign-on with a national platform, without changing the app. |

## Integration path

1. **MVP 1 (this build):** manual admin entry; public read API; every apply link goes to the original site.
2. **Next:** an import endpoint plus a nightly job that pulls the partner's listings; removed items expire automatically.
3. **Later:** single sign-on and consent-based profile sharing, so a young person sets their profile once.

## What we will not do

We will not ask partners to send applicants through us, keep CVs or documents, or brand partner listings as our own.
