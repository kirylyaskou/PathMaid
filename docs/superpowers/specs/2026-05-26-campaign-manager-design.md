# Campaign Manager Design

Date: 2026-05-26
Status: approved for implementation planning

## Goal

Campaign Manager is a new standalone PathMaid section for managing GM campaign material. It combines freeform markdown notes, freeform spreadsheet-like tables, typed campaign pages, images, links, pinned files, and an Obsidian-like graph view while staying focused on fast session prep and table use.

The feature is not a strict database editor. The base experience is writing notes and maintaining flexible tables. Structure is added only where it helps: campaign library cards, static top-level buckets, typed NPC/item/location pages, refs, and graph navigation.

## Product Shape

Campaign Manager has two levels:

1. Campaign Library
2. Campaign Workspace

Campaign Library is the entry screen for the section. Each campaign appears as a visual card with name, description, accent color, optional cover image, content counts, and last-opened metadata. Users can create and open campaigns from this screen.

Campaign Workspace has two modes:

- Editor mode: tree navigation, pinned file rail, current file editor, and refs rail.
- Graph mode: interactive graph of campaign files and their links.

The selected approach is a writer-first campaign workspace. It should feel closer to a campaign notebook with powerful linking than to a rigid CRM.

## Campaign Tree

Every campaign has fixed top-level buckets:

- Notes
- Tables
- NPCs
- Items
- Locations

These buckets are system nodes. They cannot be removed or pinned.

Inside each bucket, users can create folders with arbitrary nesting depth. Folders exist only in the left tree and do not open in the editor. Only files open in the editor.

Openable file kinds:

- note
- table
- NPC page
- item page
- location page

Typed pages are still files. They can be opened, pinned, linked, shown in refs, and shown in graph mode.

## Editor Layout

Editor mode uses this structure:

- Left: campaign tree.
- Top: pinned file rail.
- Center: current file/card with a clear visual boundary.
- Right: refs rail for the current file.

The pinned rail is not a browser-tab system. It is a quick-access strip for important openable files. Pinned files are saved per campaign and restored when the campaign opens.

Folders cannot be pinned. Files can be pinned.

## Notes And Typed Pages

Notes and typed pages use markdown as the stored document format.

Typed pages add structured profile data and one cover image:

- NPC page
- item page
- location page

Example: `General Marau` can be an NPC page with markdown notes, profile fields, one portrait image, links to other files, and refs from other notes/tables.

DB references to PF2e/custom creatures and items can be attached to documents as external refs, but they are not campaign graph nodes by default.

## Smart Selection Actions

Manual link creation is a key pain point, so the primary linking flow is selection-driven.

When the user selects text in a markdown editor, a floating command menu appears with actions:

- Add link
- Create note
- Create NPC
- Create item
- Create location

`Add link` searches existing campaign files and allowed DB refs, then replaces the selection with the appropriate markdown link or external ref syntax.

Create actions use the selected text as the title of the new file, create it under the matching top-level bucket, replace the selection with a link, and update refs/graph data through the normal link indexing path.

The `[[...]]` syntax remains supported for power users, but the selection menu is the primary MVP flow.

## Tables

Tables are separate openable files. They are not embedded inline into notes.

MVP table capabilities:

- add row
- remove row
- add column
- remove column
- edit cells
- resize columns
- resize rows
- links inside cells to campaign files

Out of scope for MVP:

- formulas
- sorting
- filtering
- typed columns
- table embeds inside notes

Tables participate in refs and Graph Mode when they link to other campaign files or other files link to them.

## Refs Rail

The refs rail is a navigation aid for the current file, not the core storage model.

It shows campaign-file links and backlinks around the current file. It should make related material easy to open without forcing Obsidian-style document jumping.

MVP refs rail does not need a preview pane. Opening a ref switches the current file in Editor mode.

## Graph Mode

Graph Mode is a separate workspace mode, not a small sidebar widget.

It shows only campaign files and links between campaign files:

- notes
- tables
- NPC pages
- item pages
- location pages

It does not show PF2e database creatures/items or custom database objects unless those have their own campaign file.

Graph visual behavior:

- badge-like nodes with readable labels
- node color by file kind or top-level bucket
- node size based on connection count
- links/backlinks/table-cell refs as graph edges
- pan and zoom
- click node to inspect details
- open or double-click node to switch to that file in Editor mode
- filters by file kind
- focus neighborhood for inspecting local connections

## Images And Assets

Images are not stored as SQLite blobs.

MVP supports:

- one optional cover image per campaign card
- one optional cover image per NPC/item/location page

Asset files live in app data under a campaign-scoped assets directory, for example:

```text
campaign-assets/<campaignId>/<assetId>.<ext>
```

SQLite stores asset metadata and relative paths only. This keeps future campaign export/import simpler: export can package campaign data plus the asset directory.

## Autosave

Autosave is required.

Notes, typed pages, table edits, profile edits, pins, tree changes, and campaign metadata should persist automatically with debounce where appropriate. The user should not need to think about saving during a session.

## Data Model

Proposed conceptual tables:

- `campaigns`
- `campaign_nodes`
- `campaign_documents`
- `campaign_tables`
- `campaign_links`
- `campaign_pins`
- `campaign_assets`

`campaign_nodes` is the universal tree node table. It represents system buckets, folders, notes, tables, NPC pages, item pages, and location pages.

`campaign_documents` stores markdown content, typed profile data, optional cover asset, and external DB refs for note-like files.

`campaign_tables` stores freeform table structure and cell data.

`campaign_links` is derived/indexed data from markdown and table cell links. It powers refs and graph mode.

`campaign_pins` stores pinned file order per campaign.

`campaign_assets` stores metadata for filesystem assets.

Exact migration/schema mechanics should follow the current PathMaid database conventions during implementation planning.

## Architecture Boundaries

This feature must follow existing PathMaid constraints:

- Tauri IPC and persistence access only through `src/shared/api/`.
- No `invoke()` calls outside `shared/api`.
- UI stays in FSD layers: pages, widgets, features, entities, shared.
- Domain logic for campaign links/tree/table transforms belongs in entities or pure libs, not page components.
- Zustand object/array selectors must use `useShallow`.
- Routing must use `createHashRouter`.
- No new npm or cargo dependencies without explicit approval.

Likely placement:

- `pages/campaigns`
- `features/campaign-manager`
- `features/campaign-editor`
- `entities/campaign`
- `entities/campaign-node`
- `shared/api/campaigns.ts`

## MVP Non-Goals

- Rich text editor.
- Formula engine.
- Table filtering/sorting.
- Inline table embeds.
- Multi-image galleries.
- DB refs as graph nodes by default.
- Folder editor view.
- Complex multi-pane document preview.
- Campaign export/import implementation. The data and asset model should leave room for it.

## Acceptance Shape

The MVP is successful when a GM can:

- create multiple campaigns from Campaign Library
- customize a campaign card with color, description, and optional image
- open a campaign workspace
- create nested folders under fixed buckets
- create and edit notes, tables, NPC pages, item pages, and location pages
- attach one image to an NPC/item/location page
- select text and turn it into a link or a new campaign file
- manage freeform tables with resizable rows and columns
- pin important files above the current editor
- see refs/backlinks for the current file
- open Graph Mode and navigate campaign-file relationships
- rely on autosave for editing
