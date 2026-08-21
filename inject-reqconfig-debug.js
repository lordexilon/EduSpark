var fs = require('fs');
var path = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(path, 'utf8');

// Replace the entire BUILD_OPTIONS line with expanded debug
c = c.replace(
    "console.error('[BUILD_OPTIONS] parsedBody model:', parsedBody.model, 'modelLabel:', parsedBody.modelLabel, 'spec:', parsedBody.spec, 'keys:', Object.keys(parsedBody).join(','));",
    "console.error('[BUILD_OPTIONS] parsedBody model:', parsedBody.model, 'modelLabel:', parsedBody.modelLabel, 'spec:', parsedBody.spec, 'keys:', Object.keys(parsedBody).join(','));\n  console.error('[REQ_CONFIG] modelSpecs:', JSON.stringify({enforce:req.config?.modelSpecs?.enforce, listLen:req.config?.modelSpecs?.list?.length, specNames:(req.config?.modelSpecs?.list||[]).map(function(s){return s.name}).join(',')}));"
);

fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', c.includes('REQ_CONFIG') ? 1 : 0);
