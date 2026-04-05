# Code Analyzer

Code Analyzer is an Electron-based desktop application that visualizes the flow of your Python and C++ code. It parses the code using Tree-sitter, generates interactive flowchart diagrams using Mermaid, and even features a live execution tracer for Python code to step through local variable states line-by-line!

## Features
- **Mermaid Block Diagrams**: Analyzes loops, conditionals, and logic within your code to generate clear Mermaid diagrams.
- **Python Execution Tracer**: Supports live tracing of Python code. Enter the desired input arguments and it will generate a step-by-step table showing line completions and tracked variables.
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
3. Under the generated diagram, look for the "Run Trace Table" input.
4. Input `5` into the Args box and click "Run Trace Table". 

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
1. Put `[2, 3, 4, 10, 40], 10` in the Args box and run the trace table to see how `low`, `high` and `mid` change!

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
*Note: Run Trace Table is currently only supported for Python, but the Mermaid Block diagram generation handles C++ seamlessly!*
