var fs = require('fs');
var apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
var c = fs.readFileSync(apiPath, 'utf8');
var changed = 0;

// Patch 2: insert global MCP loading into loadEphemeralAgent (NOT loadAddedAgent)
// Use a unique marker that only appears in loadEphemeralAgent
var funcMarker = 'async function loadEphemeralAgent({ req, spec, endpoint, model_parameters: _m }, deps) {';

// Find the start of loadEphemeralAgent, then find the tools array and web_search line
var funcStart = c.indexOf(funcMarker);
if (funcStart >= 0) {
    // Find the web_search line AFTER funcStart (unique per-function)
    var searchMarker = 'if (ephemeralAgent?.web_search === true || modelSpec?.webSearch === true) tools.push(librechat_data_provider.Tools.web_search);';
    var searchIdx = c.indexOf(searchMarker, funcStart);
    
    // Find 'const addedServers = ' AFTER searchIdx
    var addedServersStr = 'const addedServers = ';
    var addedIdx = c.indexOf(addedServersStr, searchIdx);
    
    // The code we want to insert (global MCP servers)
// Find the for loop start AFTER const addedServers = ...
var loopStr = '\tif (mcpServers.size > 0)';
var loopIdx = c.indexOf(loopStr, addedIdx);

var mcpBlock = [
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

// Check if already inserted
var checkUnique = 'isAgentsEndpoint)(endpoint)) {\n\t\tconst mcpConfig = req.config?.mcpConfig;\n\t\tif (mcpConfig) {\n\t\t\tfor (const serverName of Object.keys(mcpConfig)) {';
var checkLoc = c.indexOf(checkUnique, funcStart);

if (searchIdx >= 0 && loopIdx >= 0 && checkLoc < 0) {
    // Insert right BEFORE the 'if (mcpServers.size > 0)' loop
    var newLinePos = c.lastIndexOf('\n', loopIdx);
    c = c.slice(0, newLinePos + 1) + mcpBlock + '\n\n\t' + c.slice(newLinePos + 1);
    changed++;
}
}

fs.writeFileSync(apiPath, c, 'utf8');
console.log('Changes:', changed);
