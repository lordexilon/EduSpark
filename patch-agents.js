const fs = require('fs');
const apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
let c = fs.readFileSync(apiPath, 'utf8');
let changed = 0;

// Patch 1: replace ALL 'provider: endpoint,' with modelLabel-aware version
const old1 = '\t\tprovider: endpoint,';
const new1 = '\t\tprovider: (0, librechat_data_provider.isAgentsEndpoint)(endpoint) && model_parameters?.modelLabel ? model_parameters.modelLabel : endpoint,';
const count1 = (c.match(new RegExp(old1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
if (count1 > 0) {
    c = c.split(old1).join(new1);
    changed += count1;
}

// Patch 2: remove old misplaced MCP block (after requestPromptPrefix) first
const oldMCP = '\tif ((0, librechat_data_provider.isAgentsEndpoint)(endpoint)) {\n\t\tconst mcpConfig = req.config?.mcpConfig;\n\t\tif (mcpConfig) {\n\t\t\tfor (const serverName of Object.keys(mcpConfig)) {\n\t\t\t\tif (!addedServers.has(serverName) && !mcpServers.has(serverName)) {\n\t\t\t\t\tmcpServers.add(serverName);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}';
let oldMCPloc = c.indexOf(oldMCP);
if (oldMCPloc >= 0) {
    const promptPrefixLoc = c.indexOf('const requestPromptPrefix');
    if (oldMCPloc > promptPrefixLoc) {
        c = c.slice(0, oldMCPloc) + c.slice(oldMCPloc + oldMCP.length);
        changed++;
    }
}

// Patch 2b: insert MCP block before tool loading loop in loadEphemeralAgent
const searchMarker = 'if (ephemeralAgent?.web_search === true || modelSpec?.webSearch === true) tools.push(librechat_data_provider.Tools.web_search);';
const searchIdx = c.indexOf(searchMarker);
const mcpBlock2 = '\tif ((0, librechat_data_provider.isAgentsEndpoint)(endpoint)) {\n\t\tconst mcpConfig = req.config?.mcpConfig;\n\t\tif (mcpConfig) {\n\t\t\tfor (const serverName of Object.keys(mcpConfig)) {\n\t\t\t\tif (!addedServers.has(serverName) && !mcpServers.has(serverName)) {\n\t\t\t\t\tmcpServers.add(serverName);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\n\t';
const mcpUnique = 'isAgentsEndpoint)(endpoint) && mcpServers';
const mcpUniqueLoc = c.indexOf(mcpUnique);
if (searchIdx >= 0 && mcpUniqueLoc < 0) {
    const addedServersStart = c.indexOf('const addedServers', searchIdx);
    const newLineStart = c.lastIndexOf('\n', addedServersStart);
    c = c.slice(0, newLineStart + 1) + mcpBlock2 + c.slice(newLineStart + 1);
    changed++;
}

fs.writeFileSync(apiPath, c, 'utf8');

// Patch 3: build.js - use EPHEMERAL_AGENT_ID even for agents endpoint
const buildPath = '/app/api/server/services/Endpoints/agents/build.js';
if (fs.existsSync(buildPath)) {
    let b = fs.readFileSync(buildPath, 'utf8');
    const oldB = 'agent_id: isAgentsEndpoint(endpoint) ? agent_id : Constants.EPHEMERAL_AGENT_ID,';
    const newB = 'agent_id: agent_id || Constants.EPHEMERAL_AGENT_ID,';
    if (b.includes(oldB) && !b.includes(newB)) {
        b = b.replace(oldB, newB);
        changed++;
    }
    fs.writeFileSync(buildPath, b, 'utf8');
}

// Patch 4: add model, modelLabel, and other fields to compactAgentsBaseSchema
const dsFiles = [
    '/app/packages/data-provider/dist/data-service-XTxx76uB.js',
    '/app/node_modules/librechat-data-provider/dist/data-service-XTxx76uB.js'
];
for (const dsPath of dsFiles) {
    if (!fs.existsSync(dsPath)) continue;
    let ds = fs.readFileSync(dsPath, 'utf8');
    const schemaDef = 'const compactAgentsBaseSchema = tConversationSchema.pick({\n\tchatProjectId: true,\n\tspec: true,\n\ticonURL: true,\n\tgreeting: true,\n\tagent_id: true,\n\tinstructions: true,\n\tadditional_instructions: true\n});';
    const newSchemaDef = 'const compactAgentsBaseSchema = tConversationSchema.pick({\n\tchatProjectId: true,\n\tspec: true,\n\ticonURL: true,\n\tgreeting: true,\n\tagent_id: true,\n\tinstructions: true,\n\tadditional_instructions: true,\n\tmodel: true,\n\tmodelLabel: true,\n\ttemperature: true,\n\ttopP: true,\n\tmaxTokens: true,\n\tpromptPrefix: true\n});';
    if (ds.includes(schemaDef) && !ds.includes(newSchemaDef)) {
        ds = ds.replace(schemaDef, newSchemaDef);
        fs.writeFileSync(dsPath, ds, 'utf8');
        changed++;
    }
}

// Patch 5: canAccessAgentFromBody - use EPHEMERAL_AGENT_ID when agents endpoint and no agent_id
const accessPath = '/app/api/server/middleware/accessResources/canAccessAgentFromBody.js';
if (fs.existsSync(accessPath)) {
    let a = fs.readFileSync(accessPath, 'utf8');
    const oldA = "      if (!isAgentsEndpoint(endpoint)) {\n        agentId = Constants.EPHEMERAL_AGENT_ID;\n      }\n\n      if (!agentId) {";
    const newA = "      if (!isAgentsEndpoint(endpoint) || !agentId) {\n        agentId = Constants.EPHEMERAL_AGENT_ID;\n      }\n\n      if (!agentId) {";
    if (a.includes(oldA) && !a.includes(newA)) {
        a = a.replace(oldA, newA);
        fs.writeFileSync(accessPath, a, 'utf8');
        changed++;
    }
}

// Patch 6: Inject PyInvest CSS Theme into index.html
const indexPath = '/app/client/dist/index.html';
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    const styleInject = `
    <style>
      :root, .dark, body {
        /* #c49a45 en HSL es approx 40, 53%, 52% */
        --primary: 40 53% 52% !important;
        --color-primary: 40 53% 52% !important;
        --surface-primary: 40 53% 52% !important;
        --brand: 40 53% 52% !important;
        --text-primary: 40 53% 52% !important;
        --color-brand-500: #c49a45 !important;
        --color-green-500: #c49a45 !important;
        --color-green-600: #c49a45 !important;
      }
      /* Fallback absoluto para botones y textos */
      .bg-green-500, .bg-green-500\\/10, .bg-green-600, .bg-teal-500, .bg-brand-500, .hover\\:bg-green-600:hover, button.bg-green-500 { 
        background-color: #c49a45 !important; 
      }
      .text-green-500, .text-green-600, .text-teal-500, .text-brand-500, .text-primary { 
        color: #c49a45 !important; 
      }
      .border-green-500, .border-green-600, .border-teal-500, .border-brand-500 { 
        border-color: #c49a45 !important; 
      }
      .ring-green-500, .focus\\:ring-green-500:focus { 
        --tw-ring-color: #c49a45 !important; 
      }
      
      /* Dark Theme Tweaks to match PyInvest */
      .dark .bg-gray-800, .dark .bg-gray-900, .dark .bg-gray-950, .dark body { background-color: #1e293b !important; }
      .dark .border-gray-700, .dark .border-gray-800 { border-color: #334155 !important; }
    </style>
    </head>`;
    if (!html.includes('<!-- PyInvest Theme -->')) {
        html = html.replace('</head>', '<!-- PyInvest Theme -->' + styleInject);
        fs.writeFileSync(indexPath, html, 'utf8');
        changed++;
    }
}

console.log('All patches applied: ' + changed);
