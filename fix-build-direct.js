var fs = require('fs');
var buildPath = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(buildPath, 'utf8');

// Replace the force-model patch with a YAML direct reader
var newBuild = `const { logger } = require('@librechat/data-schemas');
const { loadAgent: loadAgentFn } = require('@librechat/api');
const { isAgentsEndpoint, removeNullishValues, Constants } = require('librechat-data-provider');
const { getMCPServerTools } = require('~/server/services/Config');
const yaml = require('js-yaml');
const path = require('path');
const db = require('~/models');

const loadAgent = (params) => loadAgentFn(params, { getAgent: db.getAgent, getMCPServerTools });

function findModelSpecBySpecName(specName) {
  try {
    var configPath = process.env.CONFIG_PATH || path.resolve(__dirname, '..', '..', '..', '..', 'librechat.yaml');
    var raw = fs.readFileSync(configPath, 'utf8');
    var config = yaml.load(raw);
    if (config && config.modelSpecs && config.modelSpecs.list) {
      return config.modelSpecs.list.find(function(s) { return s.name === specName; });
    }
  } catch(e) {
    logger.error('[build.js] Error reading config for spec lookup:', e);
  }
  return null;
}

const buildOptions = (req, endpoint, parsedBody, endpointType) => {
  const { spec, iconURL, agent_id, chatProjectId, ...model_parameters } = parsedBody;
  if (!model_parameters.model && spec) {
    var ms = findModelSpecBySpecName(spec);
    if (ms && ms.preset) {
      if (ms.preset.model) model_parameters.model = ms.preset.model;
      if (ms.preset.modelLabel) model_parameters.modelLabel = ms.preset.modelLabel;
      if (ms.preset.temperature != null) model_parameters.temperature = ms.preset.temperature;
      if (ms.preset.topP != null) model_parameters.topP = ms.preset.topP;
      if (ms.preset.maxTokens != null) model_parameters.maxTokens = ms.preset.maxTokens;
    }
  }
  const agentPromise = loadAgent({
    req,
    spec,
    agent_id: agent_id || Constants.EPHEMERAL_AGENT_ID,
    endpoint,
    model_parameters,
  }).catch((error) => {
    logger.error('[/agents/:' + agent_id + '] Error retrieving agent during build options step', error);
    return undefined;
  });

  var addedConvo = req.body && req.body.addedConvo;

  return removeNullishValues({
    spec,
    iconURL,
    endpoint,
    agent_id,
    endpointType,
    chatProjectId,
    model_parameters,
    agent: agentPromise,
    addedConvo,
  });
};

module.exports = { buildOptions };`;

fs.writeFileSync(buildPath, newBuild, 'utf8');
console.log('Build.js rewritten');
