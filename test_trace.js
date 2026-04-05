const { executeTrace } = require('./analyzer.js');

const code = `
def binary_search(arr, target):
    low = 0
    high = len(arr) - 1

    while low <= high:
        mid = (low + high) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1

binary_search([10, 20, 30, 40], 30)
`;

async function test() {
    console.log("Starting trace hook...");
    const traceData = await executeTrace(code, 0);
    console.log(JSON.stringify(traceData, null, 2));
}

test().catch(console.error);
