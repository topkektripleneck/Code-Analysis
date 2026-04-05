const { initParser } = require('./analyzer.js');
const Parser = require('web-tree-sitter');
const path = require('path');

const code = `
my_list = [1, 2, 3]
my_dict = {"a": 1, "b": 2}
my_set = {1, 2, 3}
my_tuple = (1, 2, 3)
`;

function sanitize(str) {
    if (!str) return 'condition'
    let clean = str.replace(/"/g, "'").replace(/\n/g, ' ')
    clean = clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return clean
}

function generateMermaid(node, kind) {
    let graph = 'graph TD\n'
    const id = `node_${node.id}`

    if (kind === 'Dictionary') {
        graph += `  ${id}["Dictionary Element"]\n`
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
        graph += `  ${id}["${kind} Element"]\n`
        let i = 0;
        for (let c of node.children) {
            if (c.isNamed) {
                const val = sanitize(c.text);
                graph += `  ${id}_${i}["[${i}] ${val}"]\n`
                graph += `  ${id} --- ${id}_${i}\n`
                i++;
            }
        }
    }
    return graph;
}

async function test() {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.join(__dirname, 'node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm');
    const language = await Parser.Language.load(wasmPath);
    parser.setLanguage(language);

    const tree = parser.parse(code);

    const interesting = {
        dictionary: 'Dictionary',
        list: 'List',
        set: 'Set',
        tuple: 'Tuple'
    }

    function walk(node) {
        if (interesting[node.type]) {
            console.log(`--- ${interesting[node.type]} ---`);
            console.log(generateMermaid(node, interesting[node.type]));
        }
        for (let i = 0; i < node.childCount; i++) {
            walk(node.child(i));
        }
    }
    walk(tree.rootNode);
}

test().catch(console.error);
