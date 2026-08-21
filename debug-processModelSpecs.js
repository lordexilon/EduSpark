var fs = require('fs');
var schemasPath = '/app/node_modules/@librechat/data-schemas/dist/index.cjs';
var c = fs.readFileSync(schemasPath, 'utf8');
var changed = 0;

// Find processModelSpecs and add debug
var funcStart = 'function processModelSpecs(endpoints, _modelSpecs, interfaceConfig) {';
var funcLoc = c.indexOf(funcStart);

if (funcLoc >= 0 && !c.includes('PROCESS_SPEC_DEBUG')) {
    var debug1 = '\n\tconsole.error("[PROCESS_SPEC_DEBUG] input list length:", _modelSpecs?.list?.length, JSON.stringify((_modelSpecs?.list||[]).map(function(s){return s.name+\":\"+((s.preset||{}).endpoint)})));';
    c = c.slice(0, funcLoc + funcStart.length) + debug1 + c.slice(funcLoc + funcStart.length);
    changed++;
    
    // Add debug in the loop
    var loopStart = 'for (const spec of list) {';
    var loopLoc = c.indexOf(loopStart, funcLoc);
    if (loopLoc >= 0) {
        var loopDebug = '\n\t\tconsole.error("[PROCESS_SPEC_DEBUG] checking spec:", spec.name, "endpoint:", spec.preset?.endpoint, "EModelEndpoint[ep]:", librechat_data_provider.EModelEndpoint[spec.preset?.endpoint]);';
        c = c.slice(0, loopLoc + loopStart.length) + loopDebug + c.slice(loopLoc + loopStart.length);
        changed++;
    }
    
    // Before the custom endpoint check
    var customCheck = 'const normalizedName = (0, librechat_data_provider.normalizeEndpointName)(currentEndpoint);';
    var customLoc = c.indexOf(customCheck, funcLoc);
    if (customLoc >= 0) {
        var customDebug = '\n\t\tconsole.error("[PROCESS_SPEC_DEBUG] custom endpoint check for:", spec.name, "normalizedName:", normalizedName, "customEndpoints:", JSON.stringify(customEndpoints.map(function(e){return e.name})));';
        c = c.slice(0, customLoc) + customDebug + '\n\t\t' + c.slice(customLoc);
        changed++;
    }
}

fs.writeFileSync(schemasPath, c, 'utf8');
console.log('Changes:', changed);
