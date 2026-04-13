const { initParser, analyzeCode } = require('./analyzer.js');

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
`;

async function test() {
    await initParser('python');
    const points = analyzeCode(code);
    const funcNode = points.find(p => p.kind === 'Function');
    if (funcNode) {
        console.log("--- MERMAID ---");
        console.log(funcNode.mermaid);
        console.log("--- ESSAY PARAGRAPHS ---");
        console.log(JSON.stringify(funcNode.essayParagraphs, null, 2));
    } else {
        console.log("No function node found.");
    }
}

test().catch(console.error);
