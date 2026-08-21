var fs = require('fs');
var apiPath = '/app/node_modules/@librechat/api/dist/index.cjs';
var c = fs.readFileSync(apiPath, 'utf8');
var changed = 0;

var oldMerge = [
    '\tconst merged = {',
    '\t\t...includePresetDefaults ? pickEnforcedModelSpecRequestFields(parsedBody) : parsedBody,',
    '\t\t...includePresetDefaults ? preset : {},',
    '\t\tspec: modelSpec.name',
    '\t};',
    '\tconst appliedPrivateFields = /* @__PURE__ */ new Set();',
    '\tfor (const field of PRIVATE_MODEL_SPEC_PRESET_FIELDS) {',
    '\t\tif (!Object.prototype.hasOwnProperty.call(preset, field)) continue;',
    '\t\tif (includePresetDefaults) {',
    '\t\t\tappliedPrivateFields.add(field);',
    '\t\t\tcontinue;',
    '\t\t}',
    '\t\tif (!hasModelSpecValue(field, parsedBody[field])) {',
    '\t\t\tmerged[field] = preset[field];',
    '\t\t\tappliedPrivateFields.add(field);',
    '\t\t}',
    '\t}'
].join('\n');

var newMerge = [
    '\tconst merged = {',
    '\t\t...includePresetDefaults ? pickEnforcedModelSpecRequestFields(parsedBody) : parsedBody,',
    '\t\t...includePresetDefaults ? preset : {},',
    '\t\tspec: modelSpec.name',
    '\t};',
    '\tconst appliedPrivateFields = /* @__PURE__ */ new Set();',
    '\tconst AGENT_PRESET_FIELDS = ["model","modelLabel","temperature","topP","maxTokens"];',
    '\tfor (const field of [...PRIVATE_MODEL_SPEC_PRESET_FIELDS, ...AGENT_PRESET_FIELDS]) {',
    '\t\tif (!Object.prototype.hasOwnProperty.call(preset, field)) continue;',
    '\t\tif (includePresetDefaults) {',
    '\t\t\tappliedPrivateFields.add(field);',
    '\t\t\tcontinue;',
    '\t\t}',
    '\t\tif (!hasModelSpecValue(field, parsedBody[field])) {',
    '\t\t\tmerged[field] = preset[field];',
    '\t\t\tappliedPrivateFields.add(field);',
    '\t\t}',
    '\t}'
].join('\n');

if (c.includes(oldMerge) && !c.includes(newMerge)) {
    c = c.replace(oldMerge, newMerge);
    changed++;
}

fs.writeFileSync(apiPath, c, 'utf8');
console.log('Changes:', changed);
