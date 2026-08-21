var fs = require('fs');
var path = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(path, 'utf8');

var oldLine = "console.error('[BUILD_OPTIONS] model_parameters:', JSON.stringify(Object.keys(model_parameters)), 'model:', model_parameters.model, 'modelLabel:', model_parameters.modelLabel);";
var newLine = "console.error('[BUILD_OPTIONS] parsedBody model:', parsedBody.model, 'modelLabel:', parsedBody.modelLabel, 'spec:', parsedBody.spec, 'keys:', Object.keys(parsedBody).join(','));";

c = c.replace(oldLine, newLine);
fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', c.includes(newLine) ? 1 : 0);
