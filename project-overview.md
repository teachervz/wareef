
## 1. Project Overview

Create a complete, professional, highly interactive educational platform covering the 

The project must transform the textbook into an engaging digital learning experience consisting of individual interactive HTML lesson presentations, a central teacher dashboard, a complete textbook index, and a persistent progress-tracking system.

Use HTML, CSS, and vanilla JavaScript. The platform must be easy for a teacher to use without programming knowledge.

The platform must include the following main components:

1. `home.html` — the teacher's central dashboard and complete textbook index.
2. `progress-tracker.md` — the master record of all lessons and their development and teaching statuses.
3. One independent HTML file for every lesson in the textbook.
4. `README.md` — instructions for using, maintaining, and continuing the project.
5. Shared local resources, styles, scripts, and assets when appropriate.

**CRITICAL REQUIREMENTS**

- Cover the entire textbook in /book/3rdseconday.pdf, not just one lesson or chapter.
- Extract the complete table of contents before developing any lessons.
- Preserve the exact Arabic unit and lesson titles and their original textbook order.
- Create a separate HTML file for every lesson.
- Develop lessons incrementally in manageable stages.
- Maintain the complete master index even if only a few lessons have been developed.
- Preserve the progress of both lesson development and classroom teaching.
- Never restart the project or recreate completed work simply because a session ends, an execution limit is reached, or the project must be continued later.
- Ensure that the project can be resumed from the exact point where development stopped.

## 2. Mandatory Language Requirements

The development instructions and source code may be in English, but **all student-facing educational content and all teacher-facing interface labels must be in Arabic**.

This includes:

- Lesson titles and descriptions.
- Learning objectives.
- Explanations and examples.
- Instructions and activity prompts.
- Programming questions and answer choices.
- Hints, feedback, and assessment results.
- Challenge descriptions and game instructions.
- Navigation buttons and progress labels.
- The teacher dashboard interface.
- Completion messages and motivational messages.

Use correct Arabic grammar, age-appropriate terminology, and proper RTL formatting.

Set the HTML language to Arabic and use right-to-left layout throughout the interface.

Programming code, programming keywords, filenames, technical identifiers, and developer comments may remain in English where appropriate.

Ensure that Arabic text displays correctly alongside code snippets, numbers, mathematical symbols, and Latin keywords.

## 3. Analyze the Entire Attached Textbook

Before developing any lesson, carefully analyze the attached textbook.

### Extract and verify:

- Textbook title.
- Grade level and academic term, if available.
- Complete table of contents.
- All units and chapters.
- Every lesson title in its original order.
- Relevant page numbers, where available.
- Learning objectives for each lesson, where available.
- Main concepts and terminology.
- Examples, exercises, and activities.
- Required programming skills and curriculum-specific concepts.

Use the attached textbook as the primary source of educational content.

Do not invent lesson titles, omit lessons, silently rearrange the textbook, or substitute generic programming lessons for the actual curriculum.

If the textbook contains diagrams, screenshots, code examples, or visual explanations, inspect and incorporate the relevant information into the interactive activities.

If any pages or sections are missing, unreadable, or unavailable, record the limitation in the project documentation. Do not fabricate missing information.

## 4. MOST IMPORTANT: Create the Complete Master Index FIRST

**This is a mandatory first step. Do not start developing individual lessons until the complete textbook index has been extracted and recorded.**

Create a complete master index containing every unit, chapter, and lesson found in the textbook.

The master index must be the permanent foundation of the entire project.

### Before creating lesson presentations, create:

1. `home.html`
2. `progress-tracker.md`
3. `README.md`
4. A structured master lesson manifest, such as `lesson-index.json`, containing the complete textbook structure.

The master lesson manifest must record, for every lesson:

- A unique, stable lesson ID.
- Original Arabic lesson title.
- Unit ID and unit title.
- Lesson sequence number.
- Original textbook order.
- Page range, when available.
- Intended HTML filename.
- Development status.
- Teaching status.
- Last updated date, where available.

Use a consistent lesson naming convention, such as:

- `lesson-01.html`
- `lesson-02.html`
- `lesson-03.html`

Continue numbering sequentially until every lesson in the textbook has a corresponding planned HTML filename.

Keep the original Arabic title inside each lesson and display it in the teacher dashboard.

### Important index rules

- Include every lesson, even if its HTML file has not been created yet.
- Preserve the exact textbook sequence.
- Do not mark lessons as completed merely because they appear in the index.
- Do not confuse a planned lesson with a developed lesson.
- Do not confuse a developed lesson with a lesson that has actually been taught.
- Maintain the master index throughout all development stages.
- Never replace the complete index with a partial list of the lessons currently available.

**The index must remain complete and accurate even if development stops after the first few lessons.**

## 5. Incremental Development and Resume-from-Checkpoint System

The project may contain many lessons, so develop it in manageable stages instead of trying to generate everything in a single enormous response or file.

### Phase 1: Textbook analysis

Read the textbook, extract the complete table of contents, verify the sequence, and record all lessons.

Deliver the complete index before proceeding.

### Phase 2: Foundation and project infrastructure

Create the following:

- `home.html`
- `progress-tracker.md`
- `README.md`
- `lesson-index.json`
- Shared CSS and JavaScript files, if needed.

Implement the teacher dashboard, lesson listing, navigation, progress tracking, and export functionality.

The dashboard must work even when most lesson files have not yet been generated.

### Phase 3: Develop lessons in batches

Develop a small, manageable batch of lessons at a time.

For example, complete two or three lessons per batch, depending on the length and complexity of the textbook.

Each lesson must be a complete, standalone HTML presentation based on its corresponding textbook content.

After each batch:

1. Save the completed lesson files.
2. Update their development statuses.
3. Update the master manifest.
4. Update `progress-tracker.md` when the available file-writing environment supports it, or ensure that it can be exported with the latest information.
5. Verify that all existing lessons still work.
6. Record the last completed development checkpoint.
7. Identify the next lesson that needs to be developed.
8. Update `README.md` with the continuation instructions.

### Phase 4: Integration

Ensure that every developed lesson is connected to the central dashboard.

Verify that navigation, completion controls, progress indicators, and lesson sequence are consistent.

### Phase 5: Final quality assurance

Once all lessons have been developed, verify that every entry in the textbook index corresponds to the correct lesson file and that no lessons are missing.

### Resume instructions

If development stops for any reason:

- Do not restart the project.
- Do not recreate existing files unnecessarily.
- Do not discard completed lessons.
- Read `README.md`, `lesson-index.json`, and `progress-tracker.md` before continuing.
- Identify the latest completed checkpoint.
- Verify which lesson files already exist.
- Resume with the first unfinished lesson.
- Preserve all existing content and completion statuses.
- Update only the unfinished or explicitly requested files.

Use stable lesson IDs and filenames so the project can be continued without renaming previously created files.

At the end of every development batch, provide a concise Arabic summary identifying:

- Total lessons in the textbook.
- Lessons fully developed.
- Lessons currently in progress.
- Lessons not yet developed.
- The last completed lesson.
- The next lesson to develop.
- Files created or updated.
- Any unresolved problems.

If the environment cannot continue automatically after a session ends, ensure the saved project files contain everything necessary to resume in a new session.

**Never claim that a file was saved or a lesson was completed unless the file was actually created and verified.**

## 6. Independent HTML File for Every Lesson

Every lesson must have its own HTML file.

Use a clear structure such as:

`lessons/lesson-01.html`

`lessons/lesson-02.html`

`lessons/lesson-03.html`

Continue until all textbook lessons have been covered.

Each lesson must include:

- The original Arabic lesson title.
- Unit and lesson number.
- Learning objectives.
- An engaging introduction.
- Visual explanations and demonstrations.
- Interactive activities.
- Questions and assessments.
- Appropriate challenges.
- Immediate feedback.
- A review or exit-ticket activity.
- A teacher-controlled completion button.
- A link back to `home.html`.
- Previous-lesson and next-lesson links, where applicable.

Each lesson must be self-contained in its educational content and remain independently accessible.

Shared styles and scripts may be used to avoid unnecessary duplication, but each lesson must work correctly within the complete project folder.

Do not create placeholder lesson pages and classify them as fully developed.

A lesson can be marked as development-complete only when it contains actual, verified educational content based on the corresponding textbook section and its required interactions work correctly.

## 7. Educational Design: Make Every Lesson Extremely Engaging

The lessons must be exciting, memorable, visually appealing, and appropriate for female students in Grade 8.

**The learning experience must not rely primarily on reading text from slides.**

Students should spend more time thinking, predicting, solving, experimenting, discussing, and interacting than reading paragraphs.

Use an appropriate programming adventure theme, such as:

- A digital detective mission.
- A programming laboratory.
- A code-breaking adventure.
- A digital escape room.
- A sequence of programming challenges.
- A creative problem-solving journey.

Choose a theme that supports the actual lesson content.

Include appropriate combinations of:

- Interactive questions.
- Predict-the-output challenges.
- Find-the-error activities.
- Code-completion exercises.
- Algorithm sequencing.
- Matching activities.
- Drag-and-drop exercises, where appropriate.
- Interactive demonstrations.
- Visual simulations.
- Multiple-choice questions.
- True-or-false challenges.
- Think–Pair–Share activities.
- Brainstorming.
- Collaborative learning.
- Timed or untimed challenges.
- Instant assessments.
- Exit tickets.

Do not use activities merely for decoration. Every activity must reinforce a specific learning objective.

Avoid repetitive lesson structures that make the entire textbook feel identical. Keep the overall visual identity consistent while adapting activities to each lesson.

## 8. Interactive Programming Demonstrations

Where appropriate to the actual textbook content, create interactive demonstrations that allow students to explore programming concepts.

Examples include:

### Predict the output

Display a short, curriculum-appropriate code example.

Ask students to predict what will happen before revealing the result.

### Debugging challenge

Display an example with a meaningful error.

Let students identify the problem and choose the correct fix.

### Complete the code

Provide a partially completed example and let students select the missing instruction or symbol.

### Arrange the algorithm

Allow students to arrange steps in the correct order using drag-and-drop or accessible alternative controls.

### Interactive simulator

Allow students to change inputs, execute a sequence of instructions, or observe the behavior of a programming concept.

Show the output clearly and explain the relationship between the student's action and the result.

These are examples, not mandatory content for every lesson. Use only concepts that are relevant to the specific textbook lesson.

Do not introduce advanced programming syntax that students have not learned unless it is clearly identified as optional enrichment.

## 9. Full-Screen Presentation Design

Create a professional presentation interface suitable for classroom projectors and interactive smartboards.

- Use a 16:9 presentation area.
- Make each slide fill the available presentation area.
- Prevent unwanted page scrolling during presentation mode.
- Support desktop computers, laptops, and smartboard touchscreens.
- Use readable Arabic typography, such as Tajawal or Cairo, with reliable fallbacks.
- Use large headings and appropriately sized text.
- Use a sophisticated purple-and-white color palette with subtle accent colors.
- Maintain generous whitespace.
- Avoid clutter and excessive decorative elements.
- Keep the layout stable between slides.
- Provide suitable contrast and accessible controls.

Use purposeful, subtle animations, including:

- Fade.
- Slide.
- Zoom.
- Sequential element reveals.
- Button interaction feedback.
- Correct-answer celebrations.
- Gentle icon animations.

Do not allow animations to distract from the educational objectives.

## 10. Slide Navigation and Applause

Provide smooth navigation through the presentation.

Keyboard controls:

- Right Arrow: next slide.
- Spacebar: next slide.
- Left Arrow: previous slide.
- Arabic letter key "ت": applause.

Also provide on-screen navigation buttons:

- "السابق"
- "التالي"
- "تصفيق"

Show the current slide number and total slide count.

Prevent unintended browser scrolling when navigation keys are used, while preserving normal interaction with input fields and code editors.

The applause feature must:

- Play a short sound after explicit interaction.
- Work from the applause button and the "ت" key.
- Display a brief floating-applause animation.
- Avoid autoplay.
- Use self-contained audio generation when practical.

Keep the teacher in control of slide progression at all times.

## 11. Interactive Questions and Feedback

Every lesson must include questions appropriate to its objectives.

When a student answers:

- Correct answer: display "أحسنتِ! 👏 إجابة صحيحة".
- Incorrect answer: display "حاولي مرة أخرى 💜".
- Provide a hint when appropriate.
- Explain the correct answer after the student responds or the teacher reveals it.
- Allow retry attempts.
- Do not automatically advance to the next slide.
- Keep the correct answer hidden until the appropriate interaction occurs.

Include multiple-choice, true-or-false, sequencing, debugging, code-completion, or prediction activities according to the lesson.

All questions, options, explanations, and feedback must be in Arabic.

## 12. Teacher Dashboard: `home.html`

Create an elegant, dedicated teacher dashboard named `home.html`.

This is the central entry point for the entire textbook project.

It must display:

- The textbook title.
- The grade level and academic term, where available.
- The complete textbook table of contents.
- All units and lessons in the original order.
- The HTML filename and development status of each lesson.
- The classroom teaching status of each lesson.
- The last lesson marked as completed.
- The current lesson in progress, if any.
- The next lesson to teach.
- Overall textbook progress.
- Unit-level progress.
- Total lessons.
- Fully developed lessons.
- Lessons still being developed.
- Lessons already taught.
- Lessons remaining to teach.

### Lesson status indicators

Use clear Arabic labels:

- "لم يبدأ التطوير"
- "قيد التطوير"
- "جاهز للتدريس"
- "لم يُشرح"
- "قيد الشرح"
- "تم الشرح"

Use appropriate visual indicators, such as:

- ☐ Not started.
- ◐ In progress.
- ☑ Completed.

Do not rely on colors alone to communicate status.

### Dashboard navigation buttons

Include:

- "متابعة الدرس الحالي"
- "الانتقال إلى الدرس التالي"
- "مراجعة آخر درس مكتمل"
- "عرض جميع الدروس"
- "تصدير ملف متابعة التقدم"

Each button must perform its intended action.

If a lesson file does not exist yet, do not present a broken link. Display its status and keep it accessible in the index as a lesson awaiting development.

The dashboard must remain functional while the project is still being developed.

## 13. Lesson Completion Tracking

Add a clearly visible teacher-only button inside every lesson:

"تم شرح الدرس ✓"

When clicked:

1. Update the lesson's teaching status to completed.
2. Record the completion date when supported.
3. Update the dashboard progress.
4. Update the unit progress.
5. Update the overall textbook progress.
6. Update the last-completed lesson information.
7. Identify the next lesson in the textbook sequence.

Also provide controls to mark a lesson as:

- "لم يُشرح"
- "قيد الشرح"
- "تم الشرح"

Require confirmation before resetting a completed lesson's status.

Opening a lesson must never mark it as completed automatically.

Keep the teaching status separate from the development status. A lesson may be fully developed but not yet taught.

## 14. Accurate Resume and Next-Lesson Navigation

The dashboard must distinguish clearly between reviewing the last completed lesson and continuing with the next lesson.

Implement the following behavior:

- If a lesson is marked "قيد الشرح", offer "متابعة الدرس الحالي".
- If a completed lesson exists, allow the teacher to revisit it using "مراجعة آخر درس مكتمل".
- Offer "الانتقال إلى الدرس التالي" to open the next eligible lesson in the textbook order.
- If no lesson has been taught, start with the first lesson.
- If the next lesson has not yet been developed, indicate that clearly and offer the next available developed lesson without changing the textbook's official sequence.
- If all lessons have been completed, display a message indicating that the textbook has been fully taught and allow the teacher to revisit any lesson.

Never confuse the last completed lesson with the next lesson to teach.

If the teacher leaves a lesson open and returns later, preserve the saved lesson status.

## 15. Progress Tracking File: `progress-tracker.md`

Create a Markdown file named `progress-tracker.md`.

This file must contain the complete textbook index and provide a readable record of development and teaching progress.

Include:

- Textbook title.
- Grade level.
- Complete list of units and lessons.
- Original lesson order.
- HTML filename for each lesson.
- Development status.
- Teaching status.
- Completion dates, when available.
- Notes and unresolved issues.
- Overall project statistics.
- Last completed development checkpoint.
- Next lesson to develop.

Use a table such as:

| Unit | Lesson | HTML File | Development Status | Teaching Status | Notes |
|---|---|---|---|---|---|
| [Arabic unit title] | [Arabic lesson title] | `lesson-01.html` | Not started | Not taught | |
| [Arabic unit title] | [Arabic lesson title] | `lesson-02.html` | In progress | Not taught | |
| [Arabic unit title] | [Arabic lesson title] | `lesson-03.html` | Completed | Completed | |

Use consistent development status values:

- Not started.
- In progress.
- Completed.

Use consistent teaching status values:

- Not taught.
- In progress.
- Completed.

The Markdown file must include all lessons from the beginning, not only lessons whose HTML files already exist.

### Important file-writing limitation

A normal standalone HTML page cannot reliably modify an arbitrary local Markdown file on disk without additional permissions or an appropriate file-writing environment.

Therefore:

- Use browser local storage to persist teaching progress in the same browser.
- Make the dashboard display the latest saved progress.
- Provide a working Markdown export feature that generates an updated `progress-tracker.md` file.
- Ensure the exported file contains all textbook lessons and their latest available statuses.
- Never claim that the Markdown file on disk has been updated automatically unless that operation has actually succeeded.

If the development environment supports writing project files directly, update the actual Markdown file as part of the development workflow. Otherwise, keep the export feature available for the teacher.

## 16. Persistent Progress Storage

Use browser local storage for reliable progress persistence within the same browser and device.

Store, at minimum:

- Lesson development metadata when appropriate.
- Teaching status.
- Completion dates.
- Current lesson in progress.
- Last completed lesson.
- Progress-tracking information.

Use stable lesson IDs rather than lesson titles as storage keys.

Ensure that:

- Refreshing the page does not erase progress.
- Opening a different lesson does not erase progress.
- Revisiting a lesson does not reset its status.
- Missing or corrupted data is handled safely.
- Resetting progress requires teacher confirmation.
- The teacher is informed that local storage does not automatically synchronize across different browsers or devices.

If the dashboard is opened directly using `file://`, test the chosen storage and file-navigation approach in the target browsers. Explain any browser-specific limitations and provide a practical alternative if necessary.

Do not introduce a backend or database unless explicitly requested.

## 17. Export and Backup

Provide a working export feature for the teacher.

At minimum, allow the teacher to:

1. Export an updated `progress-tracker.md`.
2. Export a backup of progress data in JSON format.
3. Restore progress from a previously exported backup, if practical.
4. See a confirmation or error message for export and restore actions.

The Markdown export must reflect the latest available teaching statuses and the complete textbook index.

Do not claim that an export succeeded before the browser confirms the operation.

The teacher should be able to back up progress before moving the project to another device.

## 18. Master Lesson Manifest: `lesson-index.json`

Create a structured manifest named `lesson-index.json` containing the complete textbook index.

It must include every lesson from the beginning, including lessons that have not yet been developed.

Use a structure similar to this:

```json
{
  "textbookTitle": "Original textbook title",
  "grade": "Second Intermediate",
  "language": "ar",
  "direction": "rtl",
  "units": [
    {
      "id": "unit-01",
      "title": "Original Arabic unit title",
      "lessons": [
        {
          "id": "lesson-01",
          "number": 1,
          "title": "Original Arabic lesson title",
          "file": "lessons/lesson-01.html",
          "developmentStatus": "not_started",
          "teachingStatus": "not_taught"
        }
      ]
    }
  ]
}
```

This is an example schema only. Populate the actual manifest using the attached textbook's verified table of contents.

Use consistent identifiers and filenames throughout the entire project.

The manifest is the authoritative structural index. Do not silently change lesson ordering or identifiers after progress has been recorded.

If statuses are also stored in browser local storage, define a clear rule for how manifest metadata and saved progress are combined.

## 19. Project Folder Structure

Organize the files as follows:

```text
programming-textbook/
│
├── home.html
├── progress-tracker.md
├── lesson-index.json
├── README.md
│
├── lessons/
│   ├── lesson-01.html
│   ├── lesson-02.html
│   ├── lesson-03.html
│   └── ... one HTML file for every textbook lesson
│
├── css/
│   └── shared.css
│
├── js/
│   ├── lesson-data.js
│   ├── progress-manager.js
│   └── shared.js
│
└── assets/
    └── optional local images and resources
```

Adjust the structure as needed, but maintain clear organization and reliable relative file paths.

Do not create unnecessary files or dependencies.

The teacher should be able to identify the dashboard, lesson files, and progress records immediately.

## 20. Teacher-Friendly Content Editing

Make the lessons easy to modify.

Keep lesson-specific educational content separate from reusable presentation logic wherever practical.

Use a clear structure for:

- Lesson titles.
- Learning objectives.
- Explanations.
- Questions.
- Answer options.
- Correct answers.
- Hints.
- Feedback.
- Activity settings.
- Challenge data.

Include clear developer comments explaining how the teacher or future developer can replace lesson content.

Do not require the teacher to modify complicated JavaScript functions to change a question or lesson title.

Keep the actual educational content grounded in the attached textbook.

## 21. Technical Requirements

Use HTML, CSS, and vanilla JavaScript.

- No backend.
- No database.
- No build process.
- No required installation.
- Avoid external libraries unless genuinely necessary.
- Prefer local assets and self-contained effects.
- Ensure all student-facing content uses Arabic and RTL.
- Support mouse, keyboard, and smartboard touch interaction.
- Prevent unwanted scrolling during presentations.
- Use responsive layouts.
- Maintain stable slide dimensions.
- Provide accessible focus states.
- Use semantic HTML.
- Avoid broken links.
- Test local navigation and relative paths.
- Ensure every control has a working action.
- Handle browser storage errors gracefully.

The project must be designed to work by opening `home.html` in a modern browser.

However, because some browsers restrict local file access, storage, or JavaScript module loading under `file://`, do not assume that every browser will support every feature identically. Prefer compatible implementation techniques and document any unavoidable limitations.

If direct local-file execution prevents a required feature from working reliably, explain the limitation and provide the simplest practical solution without introducing an unnecessary backend.

## 22. Quality Assurance

Before considering any lesson complete, verify that:

- The lesson title matches the textbook.
- The content is accurate and appropriate for the curriculum.
- The lesson file exists and opens.
- Navigation works.
- Arabic text and RTL layout are correct.
- Interactive questions function properly.
- Feedback is accurate.
- Students can retry questions.
- Correct answers remain hidden until appropriate.
- The teacher can mark the lesson's teaching status.
- Progress persists as expected.
- The dashboard reflects saved progress.
- The lesson's file paths are correct.
- No essential content remains as a placeholder.

Before considering the entire project complete, verify that:

- Every lesson in the table of contents appears in the master index.
- Every lesson has its own HTML file.
- No lessons are missing or duplicated.
- The lesson sequence matches the textbook.
- `home.html` lists the complete textbook.
- `progress-tracker.md` lists all lessons.
- `lesson-index.json` includes all lessons.
- Progress percentages are calculated correctly.
- The last completed lesson and next lesson are identified correctly.
- Markdown export works.
- Progress backup and restoration work where implemented.
- The project can be resumed without recreating existing work.

## 23. README and Continuation Instructions

Create `README.md` in English for technical instructions, while preserving Arabic for teacher-facing interface text.

Include:

- Project overview.
- Folder structure.
- How to open `home.html`.
- How to open individual lessons.
- How the teacher marks a lesson as completed.
- How progress is stored.
- How to export `progress-tracker.md`.
- How to back up and restore progress.
- How to add or edit lessons.
- How to resume development in a future session.
- Known technical limitations.

Include a dedicated section titled "Development Checkpoint" containing:

- Total lessons identified in the textbook.
- Total lessons developed.
- Total lessons awaiting development.
- Last completed lesson.
- Next lesson to develop.
- Files most recently updated.
- Unresolved issues.

Update this checkpoint at the end of each development batch.

## 24. Final Deliverables

The completed project must include:

1. `home.html` — a fully functional teacher dashboard.
2. `progress-tracker.md` — a complete, exportable lesson progress record.
3. `lesson-index.json` — the complete textbook index.
4. `README.md` — project usage and continuation instructions.
5. One separate, functional HTML file for every lesson in the textbook.
6. Shared local CSS, JavaScript, and assets as needed.
7. A reliable progress-persistence and lesson-navigation system.
8. A practical method for exporting and backing up progress.

Create actual files in the working environment when file creation is supported. Do not merely print a proposed folder structure or claim that files exist when they have not been created.

If the complete textbook is too large to process in one operation, **first complete and save the entire index and project foundation, then develop the lessons in batches**. Clearly report which files have actually been created and which lessons remain unfinished.

Do not falsely claim that the entire textbook has been completed if only a subset of lessons exists.

## 25. Final Execution Instructions

Follow this exact priority order:

**Priority 1:** Analyze the entire attached textbook and extract the complete table of contents.

**Priority 2:** Create and save the complete master index, `home.html`, `progress-tracker.md`, `lesson-index.json`, and `README.md`.

**Priority 3:** Implement the dashboard and progress-tracking foundation.

**Priority 4:** Develop the individual HTML lessons in manageable batches, in the textbook's original order.

**Priority 5:** Update the development checkpoint after every batch.

**Priority 6:** Verify each lesson and integrate it into the dashboard.

**Priority 7:** Complete the final project-wide quality checks.

**Priority 8:** Provide a clear Arabic summary of completed files, completed lessons, remaining lessons, and the exact next development step.

### Non-Negotiable Rule

**Never start from scratch when continuing an existing project. Always inspect the saved master index, progress tracker, README, checkpoint, and existing lesson files first. Resume from the first unfinished task and preserve all completed work.**

The final result must be a complete, curriculum-accurate, Arabic-first interactive programming learning platform that supports the entire textbook, not merely a single lesson or a collection of disconnected presentations.