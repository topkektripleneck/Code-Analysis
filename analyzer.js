const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const Parser = require('web-tree-sitter')
const LanguageRegistry = require('./languages/language-registry')

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

  // Load language plugin
  LanguageRegistry.load(langName)
}

function analyzeCode(code) {
  if (!parser) throw new Error("Parser not initialized. Call initParser(lang) first.");
  
  const plugin = LanguageRegistry.getCurrent()
  if (!plugin) throw new Error("Language plugin not loaded.");

  const tree = parser.parse(code)
  const points = []

  const interesting = plugin.interesting || {}

  function walk(node) {
    if (interesting[node.type]) {
      // Special case for R: left_assignment is only interesting if RHS is function_definition
      if (node.type === 'left_assignment') {
        const rhs = node.child(2)
        if (!rhs || rhs.type !== 'function_definition') {
          for (let i = 0; i < node.childCount; i++) walk(node.child(i))
          return
        }
      }

      const kind = interesting[node.type]
      const lines = code.split('\n')
      const chunk = lines
        .slice(node.startPosition.row, node.endPosition.row + 1)
        .join('\n')

      const mermaidGraph = plugin.generateMermaid ? plugin.generateMermaid(node, kind) : ""
      const essayParagraphs = plugin.generateNarrative ? plugin.generateNarrative(node, kind) : null
      const fingerprint = generateFingerprint(node, kind, plugin)

      points.push({
        kind: kind,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        source: chunk,
        mermaid: mermaidGraph,
        essayParagraphs: essayParagraphs,
        fingerprint: fingerprint
      })
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i))
    }
  }

  walk(tree.rootNode)

  // Generate Macro View Graph
  let macroGraph = 'graph TD\n'
  macroGraph += '  subgraph Module_Level_Macro_View ["Macro Architecture"]\n'
  const functions = points.filter(p => p.kind === 'Function')
  let hasEdges = false

  functions.forEach(f => {
    const fnNameMatch = f.source.match(/def\s+([a-zA-Z_0-9]+)|([a-zA-Z_0-9]+)\s*\(/)
    const fnName = fnNameMatch ? (fnNameMatch[1] || fnNameMatch[2]) : null
    
    if (fnName) {
      macroGraph += `    ${fnName}["${fnName}()"]\n`
      functions.forEach(target => {
        const targetNameMatch = target.source.match(/def\s+([a-zA-Z_0-9]+)|([a-zA-Z_0-9]+)\s*\(/)
        const targetName = targetNameMatch ? (targetNameMatch[1] || targetNameMatch[2]) : null
        
        if (targetName && fnName !== targetName) {
          const callRegex = new RegExp(`\\b${targetName}\\s*\\(`, 'g')
          if (callRegex.test(f.source)) {
            macroGraph += `    ${fnName} -->|calls| ${targetName}\n`
            hasEdges = true
          }
        }
      })
    }
  })

  // Cross-Language Execution Detection
  const rscriptRegex = /subprocess\.(?:run|Popen|call)\(\s*\[['"]Rscript['"],\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = rscriptRegex.exec(code)) !== null) {
    const scriptName = match[1].replace(/[^a-zA-Z0-9]/g, '_');
    macroGraph += `    python_env["Python Subprocess"] -->|executes R| r_${scriptName}["R: ${match[1]}"]\n`;
    macroGraph += `    style r_${scriptName} fill:#a6e3a1,stroke:#1e1e2e,color:#1e1e2e\n`;
    hasEdges = true;
  }
  
  const cppRegex = /subprocess\.(?:run|Popen|call)\(\s*\[['"]\.\/([^'"]+)['"]/g;
  while ((match = cppRegex.exec(code)) !== null) {
    const exeName = match[1].replace(/[^a-zA-Z0-9]/g, '_');
    macroGraph += `    python_env["Python Subprocess"] -->|executes binary| cpp_${exeName}["C++: ${match[1]}"]\n`;
    macroGraph += `    style cpp_${exeName} fill:#89b4fa,stroke:#1e1e2e,color:#1e1e2e\n`;
    hasEdges = true;
  }

  const rSystemRegex = /system(?:2)?\(\s*['"](?:python|python3)\s+([^'"]+)['"]/g;
  while ((match = rSystemRegex.exec(code)) !== null) {
    const scriptName = match[1].replace(/[^a-zA-Z0-9]/g, '_');
    macroGraph += `    r_env["R Environment"] -->|executes Python| py_${scriptName}["Python: ${match[1]}"]\n`;
    macroGraph += `    style py_${scriptName} fill:#cba6f7,stroke:#1e1e2e,color:#1e1e2e\n`;
    hasEdges = true;
  }

  macroGraph += '  end\n'
  if (!hasEdges && functions.length === 0) {
    macroGraph = ""
  }

  return { points, macroGraph }
}

function generateFingerprint(node, kind, plugin) {
  const language = plugin ? plugin.name : 'unknown'
  const location = {
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1
  }

  // Calculate nesting depth
  let nestingDepth = 0
  let current = node.parent
  while (current) {
    if (['function_definition', 'for_statement', 'while_statement', 'if_statement'].includes(current.type)) {
      nestingDepth++
    }
    current = current.parent
  }

  const pattern = plugin && plugin.detectPatterns ? plugin.detectPatterns(node, { language }) : null
  
  const fingerprint = {
    kind,
    language,
    location,
    condition: null, // To be filled by plugin-specific logic
    reads: [],
    writes: [],
    nestingDepth,
    containsRecursion: pattern ? pattern.label === 'recursive_call' : false,
    patternLabel: pattern ? pattern.label : null,
    complexity: 1, // Basic complexity
    spaceComplexity: null,
    timeComplexityHint: null,
    children: []
  }

  // Allow plugin to refine fingerprint
  if (plugin && plugin.refineFingerprint) {
    plugin.refineFingerprint(node, fingerprint)
  }

  return fingerprint
}

async function executeTrace(code, offset = 0) {
  const plugin = LanguageRegistry.getCurrent()
  if (plugin && plugin.executeTrace) {
    return await plugin.executeTrace(code, offset)
  }
  return [{ line: "ERROR", variables: { "TraceError": `Tracing not supported for ${plugin ? plugin.name : 'unknown language'}.` } }];
}

module.exports = {
  initParser,
  analyzeCode,
  executeTrace,
  generateFingerprint
}