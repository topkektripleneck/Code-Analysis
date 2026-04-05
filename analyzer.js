const path = require('path')
const Parser = require('web-tree-sitter')

let parser = null
let initialized = false

async function initParser(langName) {
  if (!initialized) {
    await Parser.init()
    initialized = true
  }

  parser = new Parser()

  const wasmPath = path.join(
    __dirname,
    'node_modules/tree-sitter-wasms/out',
    `tree-sitter-${langName}.wasm`
  )

  const language = await Parser.Language.load(wasmPath)
  parser.setLanguage(language)
}

function generateMermaid(node, kind) {
  let graph = 'graph TD\n'
  const id = `node_${node.id}`

  function sanitize(str) {
    if (!str) return 'condition'
    let clean = str.replace(/"/g, "'").replace(/\n/g, ' ')
    clean = clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return clean
  }

  // --- GENERALIZED ALGORITHM FLOW BUILDER ---
  if (kind === 'Function') {
    const nameNode = node.childForFieldName('name')
    const name = nameNode ? nameNode.text : 'Function'
    graph += `  ${id}["Start: ${name}()"]\n`
    graph += `  style ${id} fill:#cba6f7,stroke:#1e1e2e,color:#1e1e2e\n`

    let stepCounter = 0;

    // Helper to walk a block sequentially and return the final node ID
    function walkSequence(blockNode, parentId, branchLabel = "") {
      let prevNodeId = parentId;
      let initGroup = [];

      const flushInit = () => {
        if (initGroup.length > 0) {
          const stepId = `${id}_step_${stepCounter++}`;
          let desc = initGroup.length > 1 ? "Initialize Variables" : "Initialize / Assign";

          const txt = initGroup.map(n => n.text).join(' ');
          if (txt.includes('[]') || txt.includes('{}')) desc = "Setup Data Structures";
          else if (txt.includes('left') || txt.includes('right') || txt.includes('mid')) desc = "Setup Pointers / Boundaries";

          graph += `  ${stepId}["✏️ ${desc}"]\n`;
          graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
          branchLabel = ""; // Only apply branch label to the first node in sequence
          prevNodeId = stepId;
          initGroup = [];
        }
      };

      for (let i = 0; i < blockNode.children.length; i++) {
        const stmt = blockNode.children[i];

        if (stmt.type === 'expression_statement' && stmt.child(0) && stmt.child(0).type === 'assignment') {
          initGroup.push(stmt);
        } else {
          flushInit();

          const stepId = `${id}_step_${stepCounter++}`;

          if (stmt.type === 'while_statement' || stmt.type === 'for_statement') {
            graph += `  ${stepId}{{"🔁 Iterate / Loop"}}\n`;
            graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
            branchLabel = "";

            // Traverse loop body
            const loopBody = stmt.children.find(c => c.type === 'block');
            if (loopBody) {
              const loopEndId = walkSequence(loopBody, stepId, "Loop");
              graph += `  ${loopEndId} --> ${stepId}\n`; // Loop back
            }
            prevNodeId = stepId;

          } else if (stmt.type === 'if_statement') {
            const cond = stmt.childForFieldName('condition');
            const isBaseCase = cond && cond.text.includes('len') ? "Check Base Case" : "Conditional Logic";
            graph += `  ${stepId}{{"🔀 ${isBaseCase}"}}\n`;
            graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
            branchLabel = "";

            // Traverse if body
            const trueBody = stmt.children.find(c => c.type === 'block');
            let trueEndId = stepId, falseEndId = stepId;

            if (trueBody) {
              trueEndId = walkSequence(trueBody, stepId, "True");
            }

            // Traverse else body (if exists)
            // Tree-sitter python handles 'else' via 'elif_clause' or 'else_clause'
            const elseNode = stmt.children.find(c => c.type === 'else_clause' || c.type === 'elif_clause');
            if (elseNode) {
              const elseBody = elseNode.children.find(c => c.type === 'block');
              if (elseBody) falseEndId = walkSequence(elseBody, stepId, "False");
            } else {
              // If no else block, create a dummy pass-through so sequences connect
              const dummyId = `${id}_step_${stepCounter++}`;
              graph += `  ${dummyId}((" "))\n`;
              graph += `  ${stepId} --|False|--> ${dummyId}\n`;
              falseEndId = dummyId;
            }

            const mergeId = `${id}_step_${stepCounter++}`;
            graph += `  ${mergeId}((" "))\n`; // End of IF merge node
            graph += `  ${trueEndId} --> ${mergeId}\n`;
            graph += `  ${falseEndId} --> ${mergeId}\n`;

            prevNodeId = mergeId;

          } else if (stmt.type === 'return_statement') {
            graph += `  ${stepId}(["🏁 Return Result"])\n`;
            graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
            branchLabel = "";
            prevNodeId = stepId;
          } else if (stmt.type === 'expression_statement' && stmt.child(0) && stmt.child(0).type === 'call') {
            const callText = stmt.child(0).text;
            if (callText.includes(name)) {
              graph += `  ${stepId}["🔄 Recursive Call"]\n`;
            } else {
              graph += `  ${stepId}["⚙️ Execute Action"]\n`;
            }
            graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
            branchLabel = "";
            prevNodeId = stepId;
          } else if (stmt.isNamed) {
            // Default Fallback
            graph += `  ${stepId}["Process Step"]\n`;
            graph += `  ${prevNodeId} --${branchLabel ? '|' + branchLabel + '| ' : ''}--> ${stepId}\n`;
            branchLabel = "";
            prevNodeId = stepId;
          }
        }
      }
      flushInit();
      return prevNodeId;
    }

    const body = node.children.find(c => c.type === 'block');
    if (body) {
      walkSequence(body, id);
    }

  } else if (kind === 'If Statement') {
    const conditionNode = node.childForFieldName('condition')
    const condition = sanitize(conditionNode ? conditionNode.text : '')
    graph += `  ${id}{"if ${condition}"}\n`
    graph += `  ${id}_true["True Block"]\n`
    graph += `  ${id}_false["False Block / End"]\n`
    graph += `  ${id} -->|True| ${id}_true\n`
    graph += `  ${id} -->|False| ${id}_false\n`
  } else if (kind === 'For Loop') {
    graph += `  ${id}{"For Each Item"}\n`
    graph += `  ${id}_body["Loop Body"]\n`
    graph += `  ${id}_end["End Loop"]\n`
    graph += `  ${id} -->|Next Item| ${id}_body\n`
    graph += `  ${id}_body --> ${id}\n`
    graph += `  ${id} -->|Done| ${id}_end\n`
  } else if (kind === 'While Loop') {
    const conditionNode = node.childForFieldName('condition')
    const condition = sanitize(conditionNode ? conditionNode.text : '')
    graph += `  ${id}{"while ${condition}"}\n`
    graph += `  ${id}_body["Loop Body"]\n`
    graph += `  ${id}_end["End Loop"]\n`
    graph += `  ${id} -->|True| ${id}_body\n`
    graph += `  ${id}_body --> ${id}\n`
    graph += `  ${id} -->|False| ${id}_end\n`
  } else if (kind === 'Dictionary') {
    graph += `  ${id}["Dictionary Definition"]\n`
    let i = 0;
    for (let c of node.children) {
      if (c.type === 'pair') {
        const key = sanitize(c.child(0).text);
        const val = sanitize(c.child(2).text);
        graph += `  ${id}_${i}["${key}: ${val}"]\n`
        graph += `  ${id} --- ${id}_${i}\n`
        i++;
      }
    }
  } else if (kind === 'List' || kind === 'Set' || kind === 'Tuple') {
    graph += `  ${id}["${kind} Definition"]\n`
    let i = 0;
    const ignore = ['[', ']', '{', '}', '(', ')', ','];
    for (let c of node.children) {
      if (!ignore.includes(c.type)) {
        const val = sanitize(c.text);
        graph += `  ${id}_${i}["[${i}] ${val}"]\n`
        graph += `  ${id} --- ${id}_${i}\n`
        i++;
      }
    }
  }

  return graph
}

const { spawn } = require('child_process');

function executeTrace(code, offset = 0) {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const path = require('path');

    // Write code to a temporary file
    const tempFile = path.join(__dirname, `temp_trace_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code, 'utf8');

    const outputFile = path.join(__dirname, `temp_out_${Date.now()}.json`);

    // Create python wrapper script to read the file and invoke tracer
    const pythonScript = `
import tracer
import sys
import argparse
with open(r'${tempFile.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8') as f:
    code = f.read()

# Mock args to pass to run_trace
class Args:
    pass
args = Args()
args.output = r'${outputFile.replace(/\\/g, '\\\\')}'

tracer.args = args
tracer.run_trace(code, ${offset})
`;

    const wrapperFile = path.join(__dirname, `temp_wrapper_${Date.now()}.py`);
    fs.writeFileSync(wrapperFile, pythonScript, 'utf8');

    const pythonProcess = spawn('python', [wrapperFile]);

    let stderrData = '';

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    let isDone = false;

    const cleanup = () => {
      try { fs.unlinkSync(tempFile); } catch (e) { }
      try { fs.unlinkSync(wrapperFile); } catch (e) { }
      try { fs.unlinkSync(outputFile); } catch (e) { }
    }

    // Timeout safety
    const timeout = setTimeout(() => {
      if (isDone) return;
      isDone = true;
      pythonProcess.kill();
      cleanup();
      resolve([{ line: "ERROR", variables: { "Timeout": "Execution exceeded 3 seconds." } }]);
    }, 3000);

    pythonProcess.on('close', (codeStatus) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timeout);

      try {
        const outStr = fs.readFileSync(outputFile, 'utf8');
        const traceData = JSON.parse(outStr.trim());
        cleanup();
        resolve(traceData);
      } catch (e) {
        console.error("Failed to parse trace output:", stderrData);
        cleanup();
        resolve([{ line: "ERROR", variables: { "TraceError": "Failed to parse tracer output." } }]);
      }
    });
  });
}

function analyzeCode(code) {
  const tree = parser.parse(code)
  const points = []

  const interesting = {
    function_definition: 'Function',
    for_statement: 'For Loop',
    while_statement: 'While Loop',
    if_statement: 'If Statement',
    dictionary: 'Dictionary',
    list: 'List',
    set: 'Set',
    tuple: 'Tuple'
  }

  function walk(node) {
    if (interesting[node.type]) {
      const kind = interesting[node.type]
      const lines = code.split('\n')
      const chunk = lines
        .slice(node.startPosition.row, node.endPosition.row + 1)
        .join('\n')

      const mermaidGraph = generateMermaid(node, kind)

      points.push({
        kind: kind,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        source: chunk,
        mermaid: mermaidGraph
      })
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i))
    }
  }

  walk(tree.rootNode)
  return points
}

module.exports = { initParser, analyzeCode, executeTrace }