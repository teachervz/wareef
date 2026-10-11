# التقنية الرقمية 3 — Interactive Textbook Platform

Interactive classroom presentations for the Saudi textbook **التقنية الرقمية 3**
(التعليم الثانوي – نظام المسارات – السنة الثالثة، طبعة 1448 هـ – 2026 م),
with a teacher dashboard that holds the complete table of contents and tracks
what has been developed and what has been taught.

Plain HTML, CSS and JavaScript. No server, no database, no build step, nothing to install.
All student-facing and teacher-facing text is Arabic (RTL); code and these docs are English.

The full brief is in `project-overview.md`. One deliberate deviation: the brief speaks of a
"programming textbook" for Grade 8, but the actual book in `book/3rdsecondary.pdf` is
التقنية الرقمية 3 for the third secondary year, so the platform follows the book.

## Folder structure

```text
thirdSecondary/
├── home.html              ← start here: teacher dashboard + full textbook index
├── classroom.html         ← الإدارة الصفية: classes, roster icons, attendance, year-work grades, reports
├── index.html             ← old entry point; redirects to home.html
├── lesson-index.json      ← AUTHORITATIVE textbook index (units, lessons, pages, files, dev status)
├── progress-tracker.md    ← readable progress record (regenerate with the dashboard's export button)
├── README.md
├── project-overview.md    ← the original project brief
├── lessons/
│   ├── lesson-01.html … lesson-11.html   ← one presentation per textbook entry (all 11 exist)
├── css/shared.css         ← dashboard styles + the teacher panel inside lessons
├── css/classroom.css      ← classroom page styles
├── css/lesson-engine.css  ← shared look of lessons 04, 05, 07–11
├── js/
│   ├── lesson-data.js     ← generated copy of lesson-index.json (browsers can't read .json over file://)
│   ├── progress-manager.js← teaching status, statistics, export / backup / restore
│   ├── shared.js          ← the teacher panel added to every lesson
│   ├── lesson-engine.js   ← shared presentation engine for lessons 04, 05, 07–11
│   ├── classroom-manager.js ← classroom data (profile, classes, students, attendance, icons, notes, grades, reports, CSV)
│   └── classroom-app.js   ← the screens of classroom.html
│   ├── cloud-config.js    ← Supabase URL, public key, user e-mail (empty url = no sync)
│   ├── cloud-sync.js      ← password screen + online sync (see «Online sync»)
│   └── xlsx-reader.js     ← reads class lists from an .xlsx file
├── supabase/schema.sql    ← the database table + security rules (run once in Supabase)
├── tools/sync-lesson-data.py  ← copies lesson-index.json → js/lesson-data.js
├── archive/               ← original files kept for reference (not linked from the dashboard)
└── book/3rdsecondary.pdf  ← the textbook (source of all content)
```

## The textbook index (11 entries)

The index follows the book's table of contents (pp. 5–7), verified against the page images.
The unit project and «في الختام» pages are listed in the book under each unit's third lesson,
so they belong to that lesson's file. «قسم الذكاء الاصطناعي» and «اختبر نفسك» are separate entries.

| ID | Unit | Entry | Pages |
|---|---|---|---|
| lesson-01 | الوحدة الأولى: تخطيط المشروعات | الدرس الأول: أساسيات تخطيط المشروع | 9–22 |
| lesson-02 | الوحدة الأولى | الدرس الثاني: بناء وأتمتة خطة المشروع | 23–36 |
| lesson-03 | الوحدة الأولى | الدرس الثالث: إدارة المهام (+ مشروع الوحدة) | 37–53 |
| lesson-04 | الوحدة الثانية: دورة حياة النظام | الدرس الأول: دورة حياة النظام | 55–68 |
| lesson-05 | الوحدة الثانية | الدرس الثاني: إنشاء المُخطّط | 69–89 |
| lesson-06 | الوحدة الثانية | الدرس الثالث: الأمن السيبراني (+ مشروع الوحدة) | 90–111 |
| lesson-07 | الوحدة الثالثة: تطبيقات الهواتف الذكية | الدرس الأول: مقدمة عن تطبيقات الهواتف الذكية | 113–119 |
| lesson-08 | الوحدة الثالثة | الدرس الثاني: بناء تطبيقات الهاتف الذكي | 120–138 |
| lesson-09 | الوحدة الثالثة | الدرس الثالث: برمجة التطبيق (+ مشروع الوحدة) | 139–160 |
| lesson-10 | الوحدة الثالثة | قسم الذكاء الاصطناعي | 161–172 |
| lesson-11 | تقويم ختامي | اختبر نفسك | 173–178 |

IDs and filenames are permanent. Never renumber them once progress has been recorded.

## Using it (teacher)

1. Open `home.html` by double-clicking it. **Google Chrome or Microsoft Edge are recommended.**
2. Each entry shows its pages, topics and teaching status: ☐ لم يُشرح • ◐ قيد الشرح • ☑ تم الشرح.
   The dashboard is for the teacher, so it shows **teaching** progress only; development status is kept
   for developers in `lesson-index.json` / `progress-tracker.md`.
3. «▶ فتح الدرس» opens any lesson.
4. Quick buttons: الإدارة الصفية • متابعة الدرس الحالي • الانتقال إلى الدرس التالي • مراجعة آخر درس مكتمل • عرض جميع الدروس • تصدير ملف متابعة التقدم.
   - "Next" = the first entry in textbook order that is still «لم يُشرح».

### Inside a lesson

- Space / → next slide, ← previous, **ت** applause, **F** full screen. The slide number is kept in the address (`#12`), so refreshing returns to the same slide.
- Top-right corner: **👩‍🏫 teacher panel** (appears when the mouse moves). It contains
  «تم شرح الدرس ✓», the three teaching statuses, «🎲 اختيار طالبة عشوائيًا» (from the active class in
  classroom.html, skipping students marked absent today), previous/next lesson links and «العودة إلى لوحة المعلمة».
- «↩ متابعة من الشريحة N» appears when a lesson is reopened, offering to return to the last slide reached.
- **أدوات الحصة** (`js/lesson-toolkit.js`, top-left of every lesson), each one switched on/off by the teacher in
  classroom.html → ⚙️ الإعدادات → «🎯 أدوات الحصة»:
  - ✅ **التحضير أول كل درس** — opens automatically once a day per class (all present by default; tap a student to cycle
    حاضرة → غائبة → متأخرة → مستأذنة); saved to the class attendance record.
  - 🎲 **قرعة الإجابة** — picks a student (or a group); with «لا يتكرر الاسم» nobody is picked twice until everyone has had a turn;
    absent/excused students are skipped. Shortcut: the key «ق».
  - ⭐ **التقييم الفردي** — «✓ أجابت صحيحًا» after the lottery adds a «إجابة صحيحة» point to the student (shows in her card, reports and Excel).
  - 👥 **استراتيجية المجموعات** — 2–8 groups with teacher-chosen names; random balanced assignment or manual per student;
    a points board at the top of every lesson (click +1, right-click −1), «🏆» ranking, and «أي مجموعة أجابت؟» after correct answers.
    Points are kept per class per day. lesson-06 uses the same groups in its own team bar; with groups off, its bar and leaderboard slide are hidden.
- The school and teacher names entered in the setup appear on every lesson: on the title and preparation slides
  and in a small line at the bottom of every slide (lesson-06 shows them on its welcome slide).
- Opening a lesson never changes its status. Changing a «تم الشرح» lesson back asks for confirmation.

## Classroom management (classroom.html)

**First run:** opening `home.html` in a browser with no teacher profile redirects to `classroom.html#setup`, two steps:
1. Teacher name, school, subject, year, grade name (default «ثالث ثانوي») and **number of classes (1–10)**.
   The classes are named automatically with letters: «ثالث ثانوي أ، ب، ج…» (names can be edited).
2. One tab per class to type or paste its students (one per line; numbering and duplicates from Noor/Excel lists are removed).
   A class can be left empty and filled later.

Everything typed in the setup is saved to the browser on every keystroke, so a refresh or closing the tab loses nothing;
the draft is deleted when «✓ ابدئي» creates the classes. «تخطي الآن» skips it; everything is editable later in ⚙️ الإعدادات,
where «＋ إضافة فصل» suggests the next letter automatically.

### Everything kept in the browser (localStorage)

| Key | Contents |
|---|---|
| `dt3-classroom-v1` | profile, classes, students, attendance, icons, notes, grades, settings |
| `dt3-setup-draft-v1` | the unfinished setup page (removed when setup is finished) |
| `dt3-textbook-progress-v1` | teaching status of every lesson |
| `dt3-lesson-pos-v1` | last slide reached in each lesson — the teacher panel offers «↩ متابعة من الشريحة N» (no automatic jump, since the same lesson is repeated for each class) |
| `cyber-lesson-scores` | team points in lesson-06 |

The dashboard's comprehensive backup covers the first and third keys (the data that matters); the others are conveniences.

| Tab | What it does |
|---|---|
| 📋 الكشف | Student cards with icon counters. **Quick mode:** pick an icon, then tap students (each tap = +1, with undo). Tap a student without a mode to open her card: today's attendance, icons, notes, report link. 🎲 random pick among present students. Search. |
| ✅ الحضور | Any date (default today). «✓ الكل حاضرات» marks everyone not yet marked, then tap the absent ones. Statuses: حاضرة / غائبة / متأخرة / مستأذنة. Per-student totals and rate; recent days; CSV export. |
| 📊 أعمال السنة | Grade sheet: one column per item, totals, percentage and rating calculated automatically; «ملء الفارغ» fills empty cells with the full mark; Enter moves down like a spreadsheet; values outside 0–max are rejected; Arabic digits accepted; class averages; CSV export; print. |
| 📊 Excel | The «📊 Excel» button (header, grades, attendance and reports tabs) downloads a real `.xlsx` for the current class with 5 right-to-left sheets: ملخص الطالبات • أعمال السنة • الحضور • التقييم السريع • الملاحظات. Every sheet starts with the school, teacher, subject, year, class and export date; absences, low percentages and alerts are coloured. Settings → «📊 تصدير كل الفصول» exports all classes; the dashboard's «📊 تصدير Excel» adds a «متابعة الدروس» sheet. Built by `js/xlsx-writer.js` (no external library). |
| 📈 التقارير | Class tiles (count, average, highest, lowest, attendance rate, recorded days), rating distribution, average per item, «طالبات يحتجن متابعة» (thresholds in settings), most positive icons, printable per-student report. |
| ⚙️ الإعدادات | Profile; classes (add, rename, switch, delete); students (rename, delete, bulk add, sort); icons; grade items and maxima; rating scale and alert thresholds; backup / restore / delete. |

Rules worth knowing:
- The default grade items (10/10/20/20/10/30) are **only a suggestion**; the teacher must set the official distribution.
- While some items are still empty, the percentage is calculated over the items already entered (marked ⏳),
  so a student is not shown as weak just because her marks are not in yet.
- Attendance rate = (حاضرة + متأخرة + مستأذنة) ÷ recorded days.
- Deleting a student or class also deletes her attendance, icons, notes and grades (with confirmation).
- CSV files start with a UTF-8 BOM so Excel shows the Arabic correctly.

**Privacy:** names, attendance, grades and notes are stored only in this browser (localStorage key `dt3-classroom-v1`)
and are never sent anywhere. The dashboard's «💾 نسخة احتياطية شاملة» saves teaching progress **and** classroom data in one
JSON file; «📂 استعادة» restores either or both. Clearing browser data deletes them, so back up regularly.

## How progress is stored

- Teaching status lives in the browser's **localStorage** under the key `dt3-textbook-progress-v1`,
  keyed by lesson ID: `{ teaching, startedAt, completedAt, updatedAt }`.
- **Rule for combining data:** `developmentStatus` comes only from `lesson-index.json`.
  `teachingStatus` in the index is just the default; the browser's saved status always wins.
- With online sync configured (next section), localStorage is the working copy and every save is
  also uploaded to the teacher's account. Without it, storage is per browser and per device.
- Some browsers (Firefox, Safari) may give each local file its own storage. To cover this, links
  between the dashboard and lessons carry the latest status in `?sync=…`, and the newer record wins.
  The JSON backup remains the reliable way to move progress.
- Missing or corrupted data is ignored safely. If storage is blocked entirely, the dashboard shows a warning.

## Online sync and password (js/cloud-sync.js)

The teacher signs in with **one password** on any device (phone, laptop, smart board); all devices
see the same data. Storage is a Supabase project owned by the teacher.

- `js/cloud-config.js` holds the project URL, the public (anon / publishable) key and the e-mail of the
  single Supabase user. The teacher types only the password. An empty `url` turns sync off (old behaviour).
- `supabase/schema.sql` creates the table `teacher_data` with row-level security: only the signed-in
  user can read or write her rows. The public key alone can read nothing.
- The data is split into parts, one row each: `settings` (profile, settings, class order),
  `class_<id>` (one per class: students, attendance, icons, grades, groups, lottery) and `progress`.
  The current class and the lesson slide position stay per device.
- Each save calls `Cloud.touch()`; 1.2 s later the changed parts are uploaded. Every row has a revision
  number; if another device saved the same part first, both versions are merged field by field
  (lists with ids — students, notes, icon events — item by item) and uploaded again.
  Other devices' changes are picked up every 20 s and when the page gets focus.
- No session → a password screen covers every page. «تذكّريني» keeps the session in localStorage;
  without it the session is in sessionStorage and the downloaded data is removed from the device the
  next time a page opens without a session (so nothing stays on a shared smart board).
- The ☁️ button (bottom-left on the dashboard, top-left in lessons) shows the save state and has
  «مزامنة الآن» and «تسجيل الخروج». Signing out removes the local copy; the account keeps everything.
- First sign-in on a device that already has data (from before sync): if the account is empty the
  device's data is uploaded; otherwise the account wins and the old local data is kept under the
  localStorage key `dt3-pre-cloud-backup`.
- Supabase setup: create a project (region Frankfurt), run `supabase/schema.sql` in the SQL Editor,
  turn off «Allow new users to sign up», add one user (Authentication → Users → Add user, auto-confirm)
  with the teacher's password, and put the URL, key and that e-mail in `js/cloud-config.js`.
- Free Supabase projects pause after a week without use (e.g. holidays). Nothing is deleted;
  press «Restore» in the Supabase dashboard.

## Importing students from Excel (js/xlsx-reader.js)

«📥 استيراد» in the first-run setup and in ⚙️ الإعدادات → الفصول reads an `.xlsx` file in the browser
(no library; uses `DecompressionStream`). One class per sheet; the class name comes from «شعبة ( 1 )»
in the sheet title (else the sheet name); the names are the cells under the header «اسم الطالبة».
In settings, a class with the same name only gets the names it does not have yet.
`students.xlsx` and other spreadsheets are in `.gitignore`: student names never go to GitHub.

## Export, backup, restore

- **📝 تصدير ملف متابعة التقدم** downloads an up-to-date `progress-tracker.md` (all 11 entries).
  Copy it over the one in the project folder if you want the file on disk updated. A web page cannot overwrite it by itself.
- **💾 نسخة احتياطية (JSON)** downloads `progress-backup-YYYY-MM-DD.json`.
- **📂 استعادة نسخة احتياطية** loads such a file (asks for confirmation, replaces current statuses).
- **↺ تصفير حالة الشرح** clears all teaching statuses (asks for confirmation).

## Adding or editing lessons (developer)

1. Read the textbook pages for the entry (page range in `lesson-index.json`).
   - Text: `book/3rdsecondary.pdf`. Extracted text drops the «لا» ligature (e.g. «الأمن» → «امن»),
     so check headings against the rendered page image before copying them.
2. Create `lessons/lesson-NN.html` by copying `lesson-04.html` (or any of 05, 07–11). These files contain **only content**:
   `LESSON` and `SLIDES` in one script, then `../js/lesson-engine.js`. The engine builds the stage and controls.
   Slide types (documented at the top of `js/lesson-engine.js`):
   prep, flip, predict, title, list, equation, sort, cards, triangle, tps, order, mcq (optional `code` blocks), tf
   (optional `compact`, `start`), brainstorm, challenge, groups (`teamworkTitle`), builder, review, exit, closing,
   and the newer interactive types: **match**, **table**, **flow** (workflow-diagram builder with branches),
   **designer** (App Inventor Designer simulator with missions), **blocks** (arrange programming blocks, optional run result),
   **foodapp** (healthy-food app simulation with live variable/blocks highlighting), **assistant** (voice-assistant simulator).
   - Older files keep their own embedded engines: `lesson-01/02/03.html` (02/03 add `matrix`, `deps`, `gantt`)
     and `lesson-06.html` (1920×1080 engine with team scoring).
3. Keep the four platform lines just before the final `</body>` and set the right ID:
   ```html
   <link rel="stylesheet" href="../css/shared.css">
   <script src="../js/lesson-data.js"></script>
   <script src="../js/progress-manager.js"></script>
   <script src="../js/shared.js" data-lesson="lesson-NN"></script>
   ```
4. In `lesson-index.json` set `developmentStatus` (`not_started` → `in_progress` → `completed`), `lastUpdated` and `notes`.
   Mark `completed` only when the content is based on the textbook pages and every interaction works.
5. Run `python3 tools/sync-lesson-data.py` so `js/lesson-data.js` matches the index.
6. Regenerate `progress-tracker.md` (dashboard export button, then copy the file into the project), and update the checkpoint below.

Feedback text used by the lessons: correct → «أحسنتِ! 👏 إجابة صحيحة», wrong → «حاولي مرة أخرى 💜». Questions allow retries and never auto-advance.

## Resuming development in a new session

Do not start over. Read this README, `lesson-index.json` and `progress-tracker.md`; list `lessons/`
to see which files exist; continue with the first entry whose `developmentStatus` is not `completed`;
preserve all existing files and statuses.

## Known limitations

- Fonts come from Google Fonts; offline, pages fall back to Tahoma / Segoe UI.
- Tested in Google Chrome over `file://` (headless). Other browsers were not tested.
- The GanttProject simulator (lessons 02–03) saves its own `.json` format, not real `.gan` files.
- `lesson-01` and `lesson-06` use two different presentation engines (inherited from the original files).

## Development Checkpoint

_Last updated: 2026-10-10 — Batch 2 complete: all textbook entries developed._

- **Total entries identified in the textbook:** 11 (9 lessons + قسم الذكاء الاصطناعي + اختبر نفسك)
- **Developed:** 11 of 11 — every entry has its own working lesson file
- **Awaiting development:** none
- **Last completed lesson:** lesson-11 — اختبر نفسك
- **Next step:** classroom use and teacher review (see unresolved issues); optional: migrate lessons 01–03 and 06 to the shared engine
- **Batch 2 files:** `js/lesson-engine.js`, `css/lesson-engine.css`, `lessons/lesson-04.html`, `lesson-05.html`, `lesson-07.html` … `lesson-11.html`;
  updated `home.html` (teaching status only), `js/shared.js` (random student, resume slide), `css/shared.css` (dashboard styles scoped to `.dash`),
  `lesson-index.json`, `js/lesson-data.js`, `progress-tracker.md`, `README.md`
- **Verification:** all 11 lessons load in headless Chrome with no console errors; an automated check found no slide whose content
  overflows the 16:9 stage; the new interactive types (flow, designer, blocks, foodapp, assistant) were driven automatically to completion.
- **Unresolved issues:** see `openIssues` in `lesson-index.json` (also printed at the end of `progress-tracker.md`).
