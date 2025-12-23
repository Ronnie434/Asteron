# AI Companion MVP (Expo RN) — Next Steps Implementation Spec

## Goal
Build a **local-first** MVP (iOS + Android) in Expo that proves the core loop:
**Capture → Parse → Confirm → Save → Remind → Daily Brief**  
No auth. No sync. No “agent.” No calendar. No email ingestion.

This doc is written to hand to an AI coding agent.

---

## Tech Decisions (Locked)
- Framework: **Expo (React Native)**
- Navigation: **Expo Router**
- Storage: **Local-first SQLite** via `expo-sqlite`
- State: **Zustand**
- Notifications: **expo-notifications**
- AI usage in MVP: **text → structured JSON extraction** only  
  (LLM keys must NOT ship in the app; app calls our backend later)

---

## Milestones (Do in Order)

### Milestone 0 — Project Bootstrap (Must finish first)
**Outcome:** app runs with routing + tabs.

1) Create app:
```bash
npx create-expo-app@latest ai-companion
cd ai-companion
```

2) Install deps:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo install expo-sqlite
npx expo install expo-notifications
npm i zustand uuid
```

3) Setup Expo Router:
- Ensure `app/` folder exists.
- `app/_layout.tsx` defines tab layout.
- Tabs: Capture, Today, Upcoming, Brief, Settings.

**Acceptance:**
- App launches on iOS simulator + Android emulator/device.
- Bottom tabs visible and navigable.

---

## Milestone 1 — Data Model + SQLite (Foundation)
**Outcome:** items can be created, read, updated, deleted locally.

### Data Model (Single unified object)
Use one “Item” type for all life obligations:

- `id: string` (uuid)
- `title: string`
- `details?: string | null`
- `type: "task" | "bill" | "renewal" | "followup" | "reminder"`
- `dueAt?: string | null` (ISO datetime)
- `remindAt?: string | null` (ISO datetime, v0 supports only ONE reminder)
- `priority: "low" | "med" | "high"`
- `status: "active" | "done" | "archived"`
- `confidence: number` (0..1)
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

### SQLite Table
Create table `items`:

Columns:
- `id TEXT PRIMARY KEY`
- `title TEXT NOT NULL`
- `details TEXT`
- `type TEXT NOT NULL`
- `dueAt TEXT`
- `remindAt TEXT`
- `priority TEXT NOT NULL`
- `status TEXT NOT NULL`
- `confidence REAL NOT NULL`
- `createdAt TEXT NOT NULL`
- `updatedAt TEXT NOT NULL`

Indexes:
- index on `status`
- index on `dueAt`
- index on `remindAt`

### Required Functions (DB Layer)
Create `src/db/items.ts` implementing:

- `initDb(): Promise<void>`
- `createItem(item: Item): Promise<void>`
- `updateItem(id: string, patch: Partial<Item>): Promise<void>`
- `getItem(id: string): Promise<Item | null>`
- `listItems(filter?: { status?: string }): Promise<Item[]>`
- `deleteItem(id: string): Promise<void>`

**Acceptance:**
- DB initializes on app start.
- You can create a test item and list it.

---

## Milestone 2 — Screens Skeleton (No AI yet)
**Outcome:** core UI exists and reads/writes from SQLite.

### Screen 1: Capture (Home)
Path: `app/(tabs)/capture.tsx`

UI:
- Big input box: “Tell me anything…”
- Button: “Continue”
- Below input: small examples (optional)

Behavior:
- On Continue → call `parseTextStub(text)` returning a structured draft item.
- Navigate to Confirm screen with draft item.

### Screen 2: Confirm (Chips editor)
Path: `app/confirm.tsx` (stack screen)

UI:
- Title editable
- Chips (tap to edit):
  - Type
  - Due date/time
  - Remind date/time
  - Priority
- Buttons:
  - “Save”
  - “Back”

Behavior on Save:
- Write item to SQLite
- Schedule local notification if `remindAt` exists
- Navigate to Today tab

### Screen 3: Today
Path: `app/(tabs)/today.tsx`

Logic:
- Show active items where:
  - `dueAt` is today OR
  - `remindAt` is today OR
  - overdue (dueAt < now)

Actions per item:
- Done (status=done)
- Snooze (set remindAt = now + 1 hour and reschedule notification)

### Screen 4: Upcoming
Path: `app/(tabs)/upcoming.tsx`

Logic:
- Active items with dueAt in next 7–14 days
- Also show “Risk flags”:
  - Overdue
  - Due within 48h but no remindAt

### Screen 5: Brief
Path: `app/(tabs)/brief.tsx`

UI:
- “Today focus” (top 3 items based on simple scoring)
- “Soon” (next 3 due)
- “Overdue” section if any

No AI summarization in v0.

### Screen 6: Settings
Path: `app/(tabs)/settings.tsx`

Must-have controls:
- Quiet hours start/end
- Max notifications per day (default 3)
- “Delete all data” (danger action)
- “Privacy note” (static text)

**Acceptance:**
- You can create an item via Capture → Confirm.
- Today/Upcoming/Brief reflect saved items.

---

## Milestone 3 — Notifications (Core Product)
**Outcome:** reminders actually work and are calm, not noisy.

### Notifications Requirements
- Use **local notifications**.
- When an item is saved/updated with `remindAt`:
  - cancel existing scheduled notif for that item (if any)
  - schedule new one

Store mapping:
- Add `notificationId TEXT` column OR store mapping in separate table `item_notifications`.
Recommended: add `notificationId TEXT` column to `items`.

Notification payload should include:
- `itemId`
- `title`
- `type`

### Actions (Start Simple)
In notification:
- Done
- Snooze 1h
- Tomorrow 9am

If notification actions are too complex cross-platform, implement inside app first:
- Tapping notification opens item detail screen with quick actions.

### Throttle (Must)
Implement:
- Quiet hours: do not schedule in quiet hours; shift to next allowed time.
- Max notifications/day: if exceeded, do NOT schedule more; rely on Brief.

**Acceptance:**
- A reminder triggers at the correct time.
- Snooze reschedules correctly.
- Quiet hours respected.

---

## Milestone 4 — Replace Stub Parser with Real AI (Backend Later)
**Outcome:** app calls `/parse` endpoint; no secrets in app.

### Stub Parser (Use now)
Create `src/ai/parseTextStub.ts`:
Return a draft item from plain text with:
- title = text
- type = task
- priority = med
- confidence = 0.5
- dueAt/remindAt = null

### Real Parser Contract (Implement later)
App will call:
`POST https://YOUR_API/parse`

Request:
```json
{
  "text": "Renew car insurance next month",
  "timezone": "America/Los_Angeles",
  "locale": "en-US"
}
```

Response:
```json
{
  "title": "Renew car insurance",
  "type": "renewal",
  "priority": "high",
  "dueAt": "2026-01-15T17:00:00-08:00",
  "remindAt": "2026-01-12T09:00:00-08:00",
  "confidence": 0.86,
  "needsClarification": false,
  "question": null
}
```

**Critical:**
- App must accept `needsClarification=true` and show one question, max one.
- If confidence < 0.6, Confirm screen should highlight chips as “Review”.

---

## Folder Structure (Suggested)
```
app/
  (tabs)/
    _layout.tsx
    capture.tsx
    today.tsx
    upcoming.tsx
    brief.tsx
    settings.tsx
  confirm.tsx
  item/[id].tsx

src/
  db/
    index.ts
    items.ts
  store/
    useItemsStore.ts
    useSettingsStore.ts
  ai/
    parseTextStub.ts
    parseText.ts
  notifications/
    schedule.ts
    actions.ts
  ui/
    components/
    utils/
```

---

## Definition of Done (MVP)
MVP is done when:
- User can capture a thought, confirm it, save it
- Items appear correctly in Today/Upcoming/Brief
- Reminders fire and can be snoozed/rescheduled
- Quiet hours + max notifications/day exist
- User can delete their data

Anything beyond this is scope creep.
