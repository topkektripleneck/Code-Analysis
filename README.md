# Code Analyzer v2.1 — Literate Narrative & Execution Engine

**Code Analyzer** is a premium, Electron-based desktop application designed to bridge the gap between source code and human understanding. It translates complex structural logic into flowing English prose while providing a real-time execution playground for Python and R.

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
<img width="880" height="583" alt="image" src="https://github.com/user-attachments/assets/c0b964bf-131a-42b9-9c02-82daa9b28393" />

## 🚀 New in v2.1 (The Polish Update)

*   **IDE-Grade Editor**: Replaced standard inputs with a full **CodeMirror 5** instance, featuring syntax highlighting, line numbering, and automatic theme synchronization.
*   **Markdown Documentation Export**: Generate and download professional `.md` reports containing your architecture diagrams and literate narratives with one click.
*   **Universal Semantic Fingerprinting**: Python, C++, and R now all support deep AST-based variable tracking and cyclomatic complexity scoring.
*   **Live Terminal Routing**: Standard output (`print` statements) from execution traces are now piped directly into the embedded xterm.js panel in real-time.
*   **Cross-Language Macro Linking**: The analyzer now detects and visualizes inter-process calls (e.g., Python calling an R script or a C++ binary).

## ✨ Core Features
<img width="1284" height="832" alt="image" src="https://github.com/user-attachments/assets/00298e70-ca42-4124-8ba1-b81f70507371" />

### 📖 Literate Narrative Engine
Our recursive synthesis model traverses your code's AST to generate a "Literate Programming" style description. It explains *intent*, not just syntax, by folding nested loops and conditionals into cohesive, indented paragraphs.
<img width="628" height="313" alt="image" src="https://github.com/user-attachments/assets/1889174e-c12e-4c5a-ad1a-a2d270a840a8" />

### 📊 Macro & Micro Architecture
*   **Macro View**: Automatically generates a high-level call graph of your entire file.
*   **Micro View**: Generates Mermaid.js flowcharts for specific functions, loops, and logic branches to visualize execution paths.

### ⏱️ Interactive Trace Playback
Step through code line-by-line. The application captures environment snapshots and variable deltas, allowing you to "scrub" through execution history using a timeline slider.
<img width="631" height="479" alt="image" src="https://github.com/user-attachments/assets/5d935435-7de6-4fc4-bc6a-4f271eae0b3f" />

### 🎨 Premium Aesthetics
Built with a sleek, glassmorphic UI supporting multiple designer themes:
*   **Catppuccin Mocha** (Default)
*   **Nord Arctic**
*   **Rose Pine**
*   **One Dark**

---

## 🛠️ Technical Architecture

*   **Runtime**: Electron
*   **Parsing**: Web-Tree-Sitter (WASM)
*   **Terminal**: xterm.js + node-pty
*   **Diagrams**: Mermaid.js
*   **Editor**: CodeMirror 5
*   **Theming**: Dynamic CSS Variable Engine

---

## 📊 Language Support Matrix

| Feature | Python | C++ | R |
| :--- | :---: | :---: | :---: |
| **Static Analysis** | ✅ | ✅ | ✅ |
| **Mermaid Diagrams** | ✅ | ✅ | ✅ |
| **Literate Narrative** | ✅ | 🚧 | 🚧 |
| **Trace Playback** | ✅ | ❌ | ✅ |
| **Semantic Fingerprint** | ✅ | ✅ | ✅ |
| **Macro Call Graph** | ✅ | ✅ | ✅ |

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- **Windows**: [Python 3](https://www.python.org/) & [R](https://www.r-project.org/)
- **Linux/macOS**:
  - `python3` and `R-base` packages.
  - Build essentials for `node-pty` (e.g., `sudo apt install build-essential` on Ubuntu).

### Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/code-analyzer.git
   cd code-analyzer
   ```
2. Install dependencies (this will build native modules like `node-pty` for your OS):
   ```bash
   npm install
   ```
3. Launch the application:
   ```bash
   npm start
   ```

---

## 📜 Documentation of Changes (v2.0 → v2.1)

### Feature Enhancements
- **Editor Upgrade**: Migration from standard `<textarea>` to **CodeMirror 5**. Implemented dynamic mode switching and theme injection.
- **Reporting System**: Built a Markdown serialization engine that compiles Mermaid graphs and literate narratives into a portable `.md` format.
- **Enhanced Fingerprinting**: 
  - Added recursive DFS/BFS pattern detection for Python.
  - Implemented `refineFingerprint` hooks for C++ and R to capture AST variable scopes.
- **Macro Architecture v2**: Enhanced the call-graph generator to detect cross-process execution (e.g., Python `subprocess` calling R/C++).

### Bug Fixes & Stability
- **Terminal Routing**: Fixed an issue where trace output was invisible; implemented IPC event piping from child processes to `xterm.js`.
- **R Node Mapping**: Corrected R AST node types (`for_statement`, `while_statement`) and filtered `left_assignment` to ignore non-function variables.
- **Resource Management**: Implemented automatic cleanup of temporary trace files and fixed IPC listener leaks in the main process.
- **Linux Compatibility**: Standardized Python binary resolution (`py` vs `python3`) and shell execution (`powershell` vs `bash`).

---

## 💡 Examples & Use Cases

### 1. Algorithm Visualization (Binary Search)
Paste a standard Binary Search implementation in Python. The **Micro View** will generate a flowchart showing the `while` loop and boundary updates, while the **Literate Narrative** explains the "Divide and Conquer" logic in plain English. Use the **Trace Playback** to watch `low`, `high`, and `mid` change as you step through.

### 2. Cross-Language Architecture
If you have a Python script that orchestrates an R analysis:
```python
import subprocess
subprocess.run(["Rscript", "analysis.R"])
```
The **Macro View** will automatically draw a dependency link between your Python environment and the R script, visually mapping your multi-language pipeline.

### 3. DSA Pattern Detection
The analyzer detects common patterns like `Linked List Node` structures or `Sliding Window` logic. It tags these in the fingerprint metadata, making it easy to identify the underlying data structures at a glance.

### 🧪 Test Snippets
Copy and paste the implementation into the editor, and use the provided inputs in the **Arguments** box or as a direct call.

#### 1. Fibonacci (Recursion)
**Core Implementation**:
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```
**Sample Input (Arguments Box)**: `5`

#### 2. Merge Sort (Divide & Conquer)
**Core Implementation**:
```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```
**Sample Input (Arguments Box)**: `[38, 27, 43, 3, 9, 82, 10]`

#### 3. Quicksort (R Language)
**Core Implementation**:
```r
quicksort <- function(x) {
  if (length(x) <= 1) return(x)
  pivot <- x[1]
  rest <- x[-1]
  left <- rest[rest < pivot]
  right <- rest[rest >= pivot]
  return(c(quicksort(left), pivot, quicksort(right)))
}
```
**Sample Input (Arguments Box)**: `c(10, 5, 2, 3, 7, 6, 8, 9, 1, 4)`

#### 4. BST Insertion (C++)
**Core Implementation**:
```cpp
struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

TreeNode* insertIntoBST(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    if (val < root->val) {
        root->left = insertIntoBST(root->left, val);
    } else {
        root->right = insertIntoBST(root->right, val);
    }
    return root;
}
```

---

### 📂 Input & Data Loading (CSV)

The analyzer supports dynamic input through the **Arguments** field and bulk data loading via **CSV**.

#### Using the Arguments Box
Instead of hardcoding a call like `fibonacci(5)` at the bottom of your script, you can simply define the function and type `5` in the **Arguments** box. The analyzer automatically wraps your code with the appropriate call before tracing.

#### Loading from CSV
For algorithms that process large arrays (like Merge Sort), you can use the **Load CSV Args** button:
1.  Prepare a `.csv` file with your data (e.g., `10, 20, 30, 40`).
2.  Click **Load CSV Args** and select your file.
3.  The analyzer will parse the CSV into a native array/vector and inject it into the Arguments field.
4.  **Pro Tip**: You can slice specific rows or columns from a large CSV using the built-in selector modal that appears after selection.

---
### 🔍 Master View & Structural Flowcharts

The latest release introduces a top-level tabbed interface to separate **Component Views** from the **Master View**.

#### Master View
*   **Module-Level Macro View**: Visualizes the call graph and architectural dependencies of the entire file.
*   **Global Trace Execution**: Don't want to use the Arguments box? If your code is self-executing (e.g. you already have `print(fibonacci(5))` at the bottom), just click **Run Global Trace**. It will capture the entire file's execution path from top to bottom!

#### Structural Data Flowcharts
When defining custom data structures like `class TreeNode:` (Python) or `struct TreeNode` (C++), the engine will automatically parse your field definitions/assignments and generate a **Structural Diagram** instead of a logic flowchart. It intelligently maps pointers (`left`, `right`, `next`) versus primitive data, giving you a beautiful visual representation of your models.
## 🗺️ Roadmap (Future Updates)

- [ ] **Expanded Narratives**: Full hierarchical English synthesis for C++ and R (matching the current Python depth).
- [ ] **Language Expansion**: Support for JavaScript/TypeScript, Java, and Go plugins.
- [ ] **AI Refactoring**: Integration with LLMs to provide "Refactor Suggestions" based on the generated semantic fingerprints.
- [ ] **Live Collaboration**: A shared session mode for remote pair programming and code reviews.
- [ ] **Plugin API**: Documentation for developers to create and register their own language plugins.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

## 🤝 Contributing
Contributions are welcome! Feel free to open issues or submit pull requests to expand the narrative templates for C++ and R.
---
*Created with subpar  vibecoding*
