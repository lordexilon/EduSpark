var fs = require('fs');
var apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
var c = fs.readFileSync(apiPath, 'utf8');
var changed = 0;

// Add debug at start of loadEphemeralAgent to print model_parameters
var funcStart = 'async function loadEphemeralAgent({ req, spec, endpoint, model_parameters: _m }, deps) {';
var funcLoc = c.indexOf(funcStart);
if (funcLoc >= 0 && !c.includes('[LOAD_AGENT]')) {
    var debugLine = '  console.error("[LOAD_AGENT] _m keys:", Object.keys(_m).join(","), "model:", _m.model, "modelLabel:", _m.modelLabel, "spec:", spec);\n';
    c = c.slice(0, funcLoc + funcStart.length) + debugLine + c.slice(funcLoc + funcStart.length);
    changed++;
    console.log('Injected debug into loadEphemeralAgent');
}

// Add debug to the initialization error source
var missingModel = '"missing_model"';
var missingLoc = c.indexOf(missingModel);
if (missingLoc >= 0 && !c.includes('[MISSING_MODEL_STACK]')) {
    var beforeMissing = c.lastIndexOf('\n', missingLoc);
    var lineBefore = c.slice(c.lastIndexOf('\n', beforeMissing - 1), beforeMissing).trim();
    console.log('Found missing_model at:', missingLoc, 'context:', lineBefore);
}

fs.writeFileSync(apiPath, c, 'utf8');
console.log('Changes:', changed);
