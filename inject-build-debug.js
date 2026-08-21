var fs = require('fs');
var path = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(path, 'utf8');

var line = "const { spec, iconURL, agent_id, chatProjectId, ...model_parameters } = parsedBody;";
var debug = "console.error('[BUILD_OPTIONS] parsedBody model:', parsedBody.model, 'modelLabel:', parsedBody.modelLabel, 'spec:', parsedBody.spec, 'keys:', Object.keys(parsedBody).join(','));";

if (!c.includes('[BUILD_OPTIONS]')) {
    c = c.replace(line, debug + '\n  ' + line);
    fs.writeFileSync(path, c, 'utf8');
    console.log('Changes: 1');
} else {
    console.log('Changes: 0');
}
