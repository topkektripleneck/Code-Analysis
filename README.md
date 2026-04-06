# Code Analyzer

Code Analyzer is an Electron-based desktop application that visualizes the flow of your Python and C++ code. It parses the code using Tree-sitter, generates interactive flowchart diagrams using Mermaid, and even features a live execution tracer for Python code to step through local variable states line-by-line!

## Features
- **Mermaid Block Diagrams**: Analyzes loops, conditionals, and logic within your code to generate clear Mermaid diagrams, natively sorted in the *Static Analysis* tab.
- **Interactive Step-by-Step Playback**: Supports live tracing of Python code. Enter desired input arguments and it generates an interactive timeline player! Scrub through the execution lifetime line-by-line using the slider to graphically follow loops and watch variable updates dynamically as deltas.
- **Visual Code Highlighter**: Automatically highlights the active Python trace line directly over the source code block to help visualize logical traversal.
- **Variable Jump Tracking**: Click on any trace variable to pull up a full history of its changes through the code. Click a timeline step to jump your player straight there.
- **CSV Data Slicing**: Need to run massive datasets? Load argument sets dynamically via CSV and use the built-in slice modal to specify exact testing sub-grids.
- **Crash Error Trapping**: Dynamically traps crashes during execution within a pop-up modal so you don't lose sight of the execution state just before the failure.
- **Trace Exporting**: Easily dump trace playback variables and steps directly into a .csv using the "Export Trace" tool for metric inspection.
- **Local Desktop App**: Fast and works entirely offline.

## How to Run

1. Make sure you have [Node.js](https://nodejs.org/) installed on your machine.
2. Open your terminal in the root of the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

## Examples to Test Out

To test the application, launch it, choose the corresponding language from the top toolbar, paste the example code into the left panel, and hit **Analyze**.

### Example 1: Recursive Fibonacci (Python)

This example is perfect for testing the **Run Trace Table** functionality of the analyzer. 

```python
def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)
```
**How to test tracing:**
1. Paste the above code.
2. Click **Analyze**.
3. Under the generated diagram, look for the "Run Trace Playback" input.
4. Input `5` into the Args box and click "Run Trace Playback". 
5. See the UI Tab jump to the Playback screen. Click Next/Prev explicitly or drag the slider to watch the variable parameters update sequentially and bounce around the code recursions!

### Example 2: Binary Search (Python)

Binary search is great for visualizing loops, updates to boundaries, and complex control flows in the mermaid diagram.

```python
def binary_search(arr, x):
    low = 0
    high = len(arr) - 1
    mid = 0
 
    while low <= high:
        mid = (high + low) // 2
 
        # If x is greater, ignore left half
        if arr[mid] < x:
            low = mid + 1
 
        # If x is smaller, ignore right half
        elif arr[mid] > x:
            high = mid - 1
 
        # means x is present at mid
        else:
            return mid
 
    # If we reach here, then the element was not present
    return -1
```
**How to test tracing:**
1. Put `[2, 3, 4, 10, 40], 10` in the Args box and hit **Run Trace Playback**.
2. Click the specific variables (like `mid`) in your locals window to pop-open the jump tracker, scrub through the steps and watch `low`, `high`, and `mid` dynamically narrow bounds step-by-step alongside the code highlighting!

### Example 3: C++ Loops and Logic (C++)

Make sure to change the language dropdown to **C++** at the top before hitting analyze.

```cpp
#include <iostream>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // swap arr[j] and arr[j+1]
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}
```

### Example 4: Boundary Crash (Python)

This example is intentionally buggy to demonstrate the **Crash Error Trapping** modal. It tries to access an invalid list index inside a loop.

```python
def find_threshold(data, limit):
    total = 0
    i = 0
    while total < limit:
        # BUG: The loop doesn't check if 'i' exceeds the list length!
        total += data[i]
        i += 1
    return total
```
**How to test tracing:**
1. Put `[10, 20, 30], 100` in the Args box.
2. Click **Run Trace Playback**.
3. Watch the error modal pop up explicitly highlighting that an `IndexError` occurred at line 6. 
4. When you dismiss it, you can scrub the timeline backwards. You'll clearly see `i` became `3` (an out-of-bounds index) right before the crash step!

*Note: Run Trace Playback is currently only supported for Python, but the Mermaid Block diagram generation handles C++ seamlessly!*
