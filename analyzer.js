const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
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

// --- LITERATE NARRATIVE ENGINE HELPER FUNCTIONS ---
function formatParams(paramNode) {
  if (!paramNode || paramNode.namedChildCount === 0) return "no arguments";
  const params = [];
  for (let i = 0; i < paramNode.namedChildCount; i++) {
    params.push(`\`${paramNode.namedChild(i).text}\``);
  }
  return params.join(", ");
}

function formatArgs(argNode) {
  if (!argNode || argNode.namedChildCount === 0) return "";
  const args = [];
  for (let i = 0; i < argNode.namedChildCount; i++) {
    args.push(`\`${argNode.namedChild(i).text}\``);
  }
  return ` with arguments ${args.join(", ")}`;
}

function inferPurpose(name) {
  if (!name) return "perform its operation";
  const n = name.toLowerCase();
  if (n.startsWith("get") || n.startsWith("fetch"))  return "retrieve a value";
  if (n.startsWith("set") || n.startsWith("update")) return "modify state";
  if (n.startsWith("is")  || n.startsWith("has"))    return "check a condition";
  if (n.startsWith("calc")|| n.startsWith("compute"))return "perform a calculation";
  if (n.startsWith("sort"))                          return "sort a collection";
  if (n.startsWith("parse"))                         return "parse input";
  return "perform its operation";
}

const templates = {
  function_definition: (node) => {
    const nameNode = node.childForFieldName('name')
    const name = nameNode ? nameNode.text : 'anonymous'
    const paramNode = node.childForFieldName('parameters')
    return `The module defines the function \`${name}\`, which accepts ${formatParams(paramNode)} and is fundamentally responsible for ${inferPurpose(name)}.`
  },
  for_statement: (node) => {
    const vNode = node.childForFieldName('left')
    const iNode = node.childForFieldName('right')
    const v = vNode ? vNode.text : 'element'
    const i = iNode ? iNode.text : 'collection'
    return `The routine utilizes a loop iterating over \`${i}\`, processing each \`${v}\`.` // DYNAMIC_HOOK: replace iterableName with actual runtime list
  },
  while_statement: (node) => {
    const cNode = node.childForFieldName('condition')
    const c = cNode ? cNode.text : 'condition'
    return `The core logic relies on a while loop that iterates as long as \`${c}\`.`
  },
  if_statement: (node) => {
    const cNode = node.childForFieldName('condition')
    const c = cNode ? cNode.text : 'condition'
    return `It evaluates conditional branches to handle specific cases, checking whether \`${c}\`.`
  },
  return_statement: (node) => {
    const valNodes = node.children.slice(1)
    const val = valNodes.length > 0 ? valNodes.map(n => n.text).join('') : 'nothing'
    return `Ultimately, the function yields \`${val}\` as its final result.`
  },
  call: (node) => {
    const fnNode = node.childForFieldName('function')
    const aNode = node.childForFieldName('arguments')
    const n = fnNode ? fnNode.text : 'function'
    return `It delegates work by invoking \`${n}\`${formatArgs(aNode)}.`
  },
  import_statement: (node) => {
    const mNodes = node.children.slice(1).filter(n => n.isNamed)
    const ms = mNodes.map(n => n.text).join(', ')
    return `This context relies heavily on external dependencies, specifically importing \`${ms}\`.`
  },
  class_definition: (node) => {
    const nameNode = node.childForFieldName('name')
    const name = nameNode ? nameNode.text : 'anonymous'
    return `The component introduces a structural class, \`${name}\`, to encapsulate related state and behaviour.`
  },
  try_statement: (node) => {
    const exceptNodes = node.children.filter(c => c.type === 'except_clause')
    let errType = "error"
    if (exceptNodes.length > 0) {
       const errNode = exceptNodes[0].child(1)
       if (errNode && errNode.isNamed) errType = errNode.text
    }
    return `Execution attempts a guarded block, catching and handling potential \`${errType}\` exceptions gracefully.`
  },
  _unknown: (node) => `[untranslated: ${node.type}]`
}

function generateEssayData(node, kind) {
  // Only narrate top-level semantic boundaries. Child loops shouldn't generate redundant freestanding essays.
  if (node.type !== 'function_definition' && node.type !== 'class_definition') return null;

  function narrateSequence(blockNode, prefix = "") {
      let bodyClauses = [];
      let inits = [];
      let returnClause = "";

      for (let i = 0; i < blockNode.namedChildCount; i++) {
          const stmt = blockNode.namedChild(i);
          
          if (stmt.type === 'expression_statement' && stmt.child(0) && stmt.child(0).type === 'assignment') {
              const lhs = stmt.child(0).childForFieldName('left') || stmt.child(0).child(0);
              if (lhs) inits.push(`\`${lhs.text}\``);
          } else {
              if (inits.length > 0) {
                  bodyClauses.push(`${prefix ? prefix + ' starts' : 'It starts'} by establishing structural boundaries, initializing state for ${inits.join(', ')}.`);
                  inits = [];
              }

              if (stmt.type === 'if_statement') {
                  bodyClauses.push(templates.if_statement(stmt));
                  const innerBlock = stmt.children.find(c => c.type === 'block');
                  if (innerBlock) {
                      const innerText = narrateSequence(innerBlock, "The branch");
                      if (innerText) bodyClauses.push(`Within this branch, it proceeds as follows: ${innerText}`);
                  }
              }
              else if (stmt.type === 'for_statement' || stmt.type === 'while_statement') {
                  const t = stmt.type === 'for_statement' ? templates.for_statement(stmt) : templates.while_statement(stmt);
                  bodyClauses.push(t);
                  const innerBlock = stmt.children.find(c => c.type === 'block');
                  if (innerBlock) {
                      const innerText = narrateSequence(innerBlock, "The loop");
                      if (innerText) bodyClauses.push(`During each iteration: ${innerText}`);
                  }
              }
              else if (stmt.type === 'return_statement') {
                   returnClause = templates.return_statement(stmt);
              }
              else if (stmt.type === 'expression_statement' && stmt.child(0) && stmt.child(0).type === 'call') {
                  bodyClauses.push(templates.call(stmt.child(0)));
              }
          }
      }
      if (inits.length > 0) {
          bodyClauses.push(`${prefix ? prefix + ' finishes' : 'It finishes'} execution sequence by updating ${inits.join(', ')}.`);
      }

      let res = bodyClauses.join(' ');
      if (returnClause) res += (res ? ' ' : '') + returnClause;
      return res.trim();
  }

  let paragraphs = [];
  
  if (node.type === 'function_definition') {
    let pText = templates.function_definition(node);

    const body = node.children.find(c => c.type === 'block');
    if (body) {
        const bodyContent = narrateSequence(body, "");
        if (bodyContent) pText += " " + bodyContent;
    }

    paragraphs.push({
        type: 'intro',
        text: pText,
        sourceRange: { startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 },
        patternLabel: null,
        complexity: null
    });
  } else if (node.type === 'class_definition') {
    paragraphs.push({
        type: 'intro',
        text: templates.class_definition(node),
        sourceRange: { startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1 },
        patternLabel: null,
        complexity: null
    });
  }
  
  return paragraphs;
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

function executeTrace(code, offset = 0) {
  return new Promise((resolve, reject) => {

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

    const pythonProcess = spawn('py', [wrapperFile]);

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
      const essayParagraphs = generateEssayData(node, kind)

      points.push({
        kind: kind,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        source: chunk,
        mermaid: mermaidGraph,
        essayParagraphs: essayParagraphs
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