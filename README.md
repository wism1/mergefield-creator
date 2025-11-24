# Merge Field Creator

A specialized tool for generating functional Microsoft Word Merge Fields.

## Overview

This application solves a specific problem: generating complex, nested MS Word Merge Fields (like `IF` statements and `MERGEFIELD` codes) and copying them to the clipboard in a format that Word recognizes as active fields (Alt+F9), rather than plain text.

Browser-based clipboard APIs often sanitize or mishandle the specific RTF (Rich Text Format) codes required for Word fields. This application uses a Python backend to directly access the Windows Clipboard API, ensuring perfect fidelity.

## Features

- **Visual Field Builder**: Drag-and-drop interface to construct complex field logic.
- **Supported Field Types**:
  - **Simple Merge Field**: Standard `{ MERGEFIELD Name }`.
  - **IF Condition**: Conditional logic `{ IF { MERGEFIELD A } = "Value" "True" "False" }`. Supports nested fields in results.
  - **Check Empty**: A shorthand for checking if a field is empty and providing a fallback.
- **Direct Clipboard Copy**: One-click copy to clipboard using native Windows APIs.
- **Nested Logic**: Create deeply nested conditions (e.g., an IF statement inside another IF statement's true result).

## Prerequisites

- Windows OS (Required for `pywin32` clipboard access)
- Python 3.x

## Installation

1.  Clone or download this repository.
2.  Install the required Python dependencies:

    ```bash
    pip install -r requirements.txt
    ```

    *Note: Ensure `pywin32` and `flask` are installed.*

## Usage

1.  Start the application:

    ```bash
    python app.py
    ```

2.  Open your web browser and navigate to `http://127.0.0.1:5000`.
3.  Use the **Toolbox** on the left to drag field types into the **Workspace**.
4.  Configure your fields (set names, conditions, etc.).
5.  Click **Copy to Clipboard**.
6.  Paste directly into your Microsoft Word document.
    - *Tip: Press `Alt + F9` in Word to toggle between viewing the field codes and the result.*

## Troubleshooting

- **"Failed to fetch" error**: Ensure the Python backend (`app.py`) is running. The frontend needs to communicate with the backend to perform the clipboard operation.
- **Fields paste as text**: Make sure you are using the "Copy to Clipboard" button in the app, not manually selecting text. The app generates specific RTF headers that are invisible to the eye but necessary for Word.

## Project Structure

- `app.py`: Flask backend handling RTF generation and Windows clipboard operations.
- `templates/index.html`: Main user interface.
- `static/script.js`: Frontend logic for drag-and-drop and state management.
- `static/style.css`: Styling for the visual builder.
