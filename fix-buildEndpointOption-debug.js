var fs = require('fs');
var path = '/app/api/server/middleware/buildEndpointOption.js';
var c = fs.readFileSync(path, 'utf8');
var changed = 0;

// Add debug at the start of the else if branch
var elseIfBlock = "} else if (parsedBody.spec && appConfig.modelSpecs?.list) {\n    const modelSpec = findModelSpecByName(appConfig.modelSpecs, parsedBody.spec);";
var elseIfDebug = "} else if (parsedBody.spec && appConfig.modelSpecs?.list) {\n    console.error('[ELSE_IF] spec:', parsedBody.spec, 'list length:', appConfig.modelSpecs?.list?.length);\n    const modelSpec = findModelSpecByName(appConfig.modelSpecs, parsedBody.spec);";

if (!c.includes('ELSE_IF')) {
    c = c.replace(elseIfBlock, elseIfDebug);
    changed++;
}

// Add debug after applyModelSpecPreset result in the else if branch
var postApply = "parsedBody = result.parsedBody;\n        appliedModelSpecPrivateFields = result.appliedPrivateFields;\n      } catch (error) {";
var postApplyDebug = "console.error('[ELSE_IF_AFTER_APPLY] model:', result.parsedBody.model, 'modelLabel:', result.parsedBody.modelLabel, 'keys:', Object.keys(result.parsedBody).join(','));\n        parsedBody = result.parsedBody;\n        appliedModelSpecPrivateFields = result.appliedPrivateFields;\n      } catch (error) {";

// Need to find the correct location - there are two places with similar code
// We want the one in the else-if branch, which is the SECOND occurrence
var firstPostApply = c.indexOf(postApply);
var secondPostApply = c.indexOf(postApply, firstPostApply + 50);

if (secondPostApply >= 0 && !c.includes('ELSE_IF_AFTER_APPLY')) {
    c = c.slice(0, secondPostApply) + postApplyDebug + c.slice(secondPostApply + postApply.length);
    changed++;
}

fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', changed);
