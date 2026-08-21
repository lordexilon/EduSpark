var fs = require('fs');

// Fix build.js in agents service - inject model/modelLabel from spec if not present
var buildPath = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(buildPath, 'utf8');

var oldCode = "const { spec, iconURL, agent_id, chatProjectId, ...model_parameters } = parsedBody;";
var newCode = "const { spec, iconURL, agent_id, chatProjectId } = parsedBody;\n" +
"  let model_parameters = { ...parsedBody };\n" +
"  delete model_parameters.spec; delete model_parameters.iconURL; delete model_parameters.agent_id; delete model_parameters.chatProjectId;\n" +
"  if (!model_parameters.model && req.config?.modelSpecs?.list) {\n" +
"    var ms = req.config.modelSpecs.list.find(function(s) { return s.name === spec; });\n" +
"    if (ms && ms.preset) {\n" +
"      if (ms.preset.model) model_parameters.model = ms.preset.model;\n" +
"      if (ms.preset.modelLabel) model_parameters.modelLabel = ms.preset.modelLabel;\n" +
"    }\n" +
"  }";

if (!c.includes('force-model')) {
    c = c.replace(oldCode, "// force-model patch\n  " + newCode);
}

// Also add debug
if (!c.includes('FORCE_MODEL')) {
    c = c.replace('const agentPromise = loadAgent({', "console.error('[FORCE_MODEL] model:', model_parameters.model, 'modelLabel:', model_parameters.modelLabel);\n  const agentPromise = loadAgent({");
}

fs.writeFileSync(buildPath, c, 'utf8');

console.log('Changes applied:', c.includes('force-model') ? 1 : 0);
