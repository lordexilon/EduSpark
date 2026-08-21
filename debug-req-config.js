var fs = require('fs');
var path = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(path, 'utf8');

var debug = "console.error('[BUILD_OPTIONS] modelSpecs:', JSON.stringify({enforce:req.config?.modelSpecs?.enforce, listLen:req.config?.modelSpecs?.list?.length, specNames:(req.config?.modelSpecs?.list||[]).map(function(s){return s.name}).join(',')}));";

var line = "console.error('[BUILD_OPTIONS] parsedBody model:'";

// Replace the existing BUILD_OPTIONS line
c = c.replace("console.error('[BUILD_OPTIONS] parsedBody model:", "console.error('[BUILD_OPTIONS] parsedBody model:");
var origLine = "console.error('[BUILD_OPTIONS] parsedBody model:", parsedBody.model, 'modelLabel:', parsedBody.modelLabel, 'spec:', parsedBody.spec, 'keys:', Object.keys(parsedBody).join(','));";
c = c.replace(origLine, origLine + "\n  " + debug);

fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', c.includes('specNames') ? 1 : 0);
