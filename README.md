# COMP 102 Assignment Desk

An offline-first assignment and Java practical tracker for **UKZN COMP 102 students**.

The app helps students keep Java practicals organised, choose a final `.java` file, prepare a Moodle handoff record, and keep their task list available when campus connectivity is unreliable.

## Features

- UKZN and COMP 102 branded interface.
- Two role views: Student submission workspace and Academic review dashboard.
- Student name saved locally in the browser.
- Java practical and assignment queue with due dates.
- Filters for all, in-progress, ready, and submitted work.
- Local file-name selection for PDF, DOCX, ZIP, and Java source files.
- Moodle handoff preparation without uploading files to a third party.
- Browser `localStorage` persistence for tasks and submission records.
- JSON backup download for moving records to another device.
- Responsive layout for desktop and mobile screens.
- Offline mode needs no framework, build step, database, or external API.
- Optional local Qwen integration through Ollama.
- Approved-example JSONL export for Qwen fine-tuning.
- Reproducible LoRA fine-tuning script for Qwen2.5-Coder.

## Dynamic Qwen mode

The browser-only mode works offline with local browser storage. For shared data and Qwen integration, run the Python backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

Open [http://localhost:8000](http://localhost:8000). The backend stores shared tasks and training examples in `data.json`, which is intentionally ignored by Git because it may contain student work.

To run Qwen locally, install Ollama, then pull the configured model:

```powershell
ollama pull qwen2.5-coder:1.5b
```

The Student view sends Java questions to Qwen through the backend. The Academic view can add and approve question-and-answer examples. Download the approved data from `Download approved JSONL dataset`, then fine-tune:

```powershell
python fine_tune_qwen.py --data comp102-java-training.jsonl
```

The training script uses LoRA and saves the adapter under `models/qwen-comp102-java`. Training requires a suitable Python environment and GPU or enough CPU memory; the web app does not train a model in the browser.

## Run locally

### Option 1: Open the file

Double-click `index.html` to open the app directly in a browser.

### Option 2: Use a local server

From the project folder, run:

```powershell
py -m http.server 5500
```

Then open [http://localhost:5500](http://localhost:5500).

## How to use it

### Student view

1. Enter your name in the `Student` field in the header.
2. Select a practical from the assignment queue.
3. Click `Prepare` for that practical.
4. Choose your final submission file.
5. Confirm that the file is your final version.
6. Click `Mark ready for Moodle`.
7. When connected, open the correct COMP 102 activity in Moodle and upload the same file.
8. Use the download button at the bottom to export a JSON backup of your records.

### Academic view

1. Click `Academic view` in the header.
2. Review the shared COMP 102 Java practical queue.
3. See tasks, prepared file names, due dates, and submission status.
4. Mark a `Ready` handoff as `Submitted` after it has been checked on Moodle.
5. Click `Student view` to return to the student workspace.

The current version uses a local role switch for the prototype. Both views read the same browser-stored course data. Production deployment should add authenticated UKZN accounts and a shared database so students and academics can access the same records from different devices.

## Project structure

```text
.
├── index.html   # Page structure and accessible form controls
├── styles.css   # Responsive visual design and layout
├── app.js       # Queue, local storage, filters, and export behavior
└── README.md   # Project documentation
```

## Offline and privacy notes

The app stores task data, the student name, and submission details in the browser's local storage. It stores only the selected file name, not the file contents. Files are not uploaded by this app.

Browser storage is device-specific. Use the JSON backup button regularly if you need to move your records or protect them from browser data being cleared.

## Moodle limitation

This is a browser-only offline tool. It cannot submit directly to Moodle while disconnected and it does not handle UKZN login or authentication. A Moodle submission still requires an internet connection and the student's normal Moodle access.

## Publish with GitHub Pages

Because this project is plain HTML, CSS, and JavaScript, it can be hosted directly with GitHub Pages:

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md`.
3. Open the repository's `Settings` tab.
4. Select `Pages`.
5. Choose `Deploy from a branch`, select the default branch and `/root`, then save.
6. Open the published Pages URL when GitHub finishes deploying.

## License

This project is intended as a student project and learning tool.
