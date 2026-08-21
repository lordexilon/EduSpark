var fs = require('fs');
var apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
var c = fs.readFileSync(apiPath, 'utf8');
var changed = 0;

// Find applyModelSpecPreset and add debug before and after the reparsedBody
var applyMarker = 'function applyModelSpecPreset({ modelSpec, parsedBody, endpoint, endpointType, defaultParamsEndpoint, includePresetDefaults }) {';
var applyLoc = c.indexOf(applyMarker);
if (applyLoc >= 0 && !c.includes('APPLY_TRACE')) {
    // Add debug after mergeModelSpecPreset but before parseCompactConvo
    var mergeCallEnd = 'const { parsedBody: conversation, appliedPrivateFields } = mergeModelSpecPreset(modelSpec, parsedBody, { includePresetDefaults });';
    var mergeTrace = 'const { parsedBody: conversation, appliedPrivateFields } = mergeModelSpecPreset(modelSpec, parsedBody, { includePresetDefaults });\n\tconsole.error("[APPLY_TRACE] conversation:", JSON.stringify({model:conversation.model,modelLabel:conversation.modelLabel,spec:conversation.spec}));';
    
    var mergeLoc = c.indexOf(mergeCallEnd);
    if (mergeLoc >= 0) {
        c = c.slice(0, mergeLoc) + mergeTrace + c.slice(mergeLoc + mergeCallEnd.length);
        changed++;
    }
    
    // Add debug after parseCompactConvo
    var parseCallEnd = 'const reparsedBody = (0, librechat_data_provider.parseCompactConvo)({';
    var parseTrace = 'const reparsedBody = (0, librechat_data_provider.parseCompactConvo)({\n\t\tendpoint,\n\t\tendpointType,\n\t\tconversation,\n\t\tdefaultParamsEndpoint\n\t});\n\tconsole.error("[APPLY_TRACE] reparsedBody:", JSON.stringify({model:reparsedBody?.model,modelLabel:reparsedBody?.modelLabel,keys:Object.keys(reparsedBody||{})}));';
    
    // Find the end of the parseCompactConvo call
    var parseLoc = c.indexOf(parseCallEnd, applyLoc);
    if (parseLoc >= 0) {
        // Find the closing paren and semicolon
        var parseEnd = c.indexOf('\n\tif (!reparsedBody)', parseLoc);
        if (parseEnd >= 0) {
            c = c.slice(0, parseEnd) + '\n\tconsole.error("[APPLY_TRACE] reparsedBody:", JSON.stringify({model:reparsedBody?.model,modelLabel:reparsedBody?.modelLabel,keys:Object.keys(reparsedBody||{})}));\n' + c.slice(parseEnd);
            changed++;
        }
    }
}

fs.writeFileSync(apiPath, c, 'utf8');
console.log('Changes:', changed);
