var fs = require('fs');
var apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
var c = fs.readFileSync(apiPath, 'utf8');
var changed = 0;

// ADD DEBUG at start of applyModelSpecPreset
var applyStart = 'function applyModelSpecPreset({ modelSpec, parsedBody, endpoint, endpointType, defaultParamsEndpoint, includePresetDefaults }) {';
var applyDebug = 'function applyModelSpecPreset({ modelSpec, parsedBody, endpoint, endpointType, defaultParamsEndpoint, includePresetDefaults }) {\n\tconsole.error("[DEBUG] applyModelSpecPreset called", JSON.stringify({parsedBody,preset:modelSpec.preset}));';
var applyLoc = c.indexOf(applyStart);
if (applyLoc >= 0 && !c.includes('[DEBUG] applyModelSpecPreset')) {
    c = c.slice(0, applyLoc) + applyDebug + c.slice(applyLoc + applyStart.length);
    changed++;
}

// ADD DEBUG in mergeModelSpecPreset - log after merge loop
var mergeReturn = '\treturn {\n\t\tparsedBody: merged,\n\t\tappliedPrivateFields\n\t};';
var debugCode = '\tconsole.error("[MERGED] model:", JSON.stringify({model:merged.model,modelLabel:merged.modelLabel,parsedModel:parsedBody.model,presetModel:preset.model,spec:merged.spec}));\n\treturn {\n\t\tparsedBody: merged,\n\t\tappliedPrivateFields\n\t};';
var mergeReturnLoc = c.indexOf(mergeReturn, 20730);
if (mergeReturnLoc >= 0 && !c.includes('[MERGED]')) {
    c = c.slice(0, mergeReturnLoc) + debugCode + c.slice(mergeReturnLoc + mergeReturn.length);
    changed++;
}

// Remove the misplaced MCP block in loadEphemeralAgent (before addedServers)
var funcMarker = 'async function loadEphemeralAgent({ req, spec, endpoint, model_parameters: _m }, deps) {';
var funcStart = c.indexOf(funcMarker);

// The misplaced block
var mcpText = '\tif ((0, librechat_data_provider.isAgentsEndpoint)(endpoint)) {\n\t\tconst mcpConfig = req.config?.mcpConfig;\n\t\tif (mcpConfig) {\n\t\t\tfor (const serverName of Object.keys(mcpConfig)) {\n\t\t\t\tif (!addedServers.has(serverName) && !mcpServers.has(serverName)) {\n\t\t\t\t\tmcpServers.add(serverName);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}';
var mcpLoc = c.indexOf(mcpText, funcStart);

// Verify this is the wrong one (before addedServers)
var addedLabel = '\tconst addedServers = ';
var addedLoc = c.indexOf(addedLabel, funcStart);

if (mcpLoc >= 0 && addedLoc >= 0 && mcpLoc < addedLoc) {
    // Remove the misplaced block AND the trailing blank lines
    var afterMCP = c.indexOf('\tconst addedServers', mcpLoc);
    c = c.slice(0, mcpLoc) + c.slice(afterMCP);
    changed++;
    
    // Now find the loop start and insert after addedServers but before the loop
    var loopStr = '\tif (mcpServers.size > 0)';
    var addedLoc2 = c.indexOf(addedLabel, funcStart);
    var loopLoc = c.indexOf(loopStr, addedLoc2);
    
    if (loopLoc >= 0) {
        var newMCP = [
            '\tif ((0, librechat_data_provider.isAgentsEndpoint)(endpoint)) {',
            '\t\tconst mcpConfig = req.config?.mcpConfig;',
            '\t\tif (mcpConfig) {',
            '\t\t\tfor (const serverName of Object.keys(mcpConfig)) {',
            '\t\t\t\tif (!addedServers.has(serverName) && !mcpServers.has(serverName)) {',
            '\t\t\t\t\tmcpServers.add(serverName);',
            '\t\t\t\t}',
            '\t\t\t}',
            '\t\t}',
            '\t}',
        ].join('\n');
        
        var newLinePos = c.lastIndexOf('\n', loopLoc);
        c = c.slice(0, newLinePos + 1) + newMCP + '\n\n\t' + c.slice(newLinePos + 1);
        changed++;
    }
}

fs.writeFileSync(apiPath, c, 'utf8');
console.log('Changes:', changed);
