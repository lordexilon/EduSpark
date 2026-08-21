var fs = require('fs');
var path = '/app/api/server/middleware/buildEndpointOption.js';
var c = fs.readFileSync(path, 'utf8');
var changed = 0;

// Add debug before the else if branch
var elseIf = '} else if (parsedBody.spec && appConfig.modelSpecs?.list) {';
if (!c.includes('DEBUG elseIf')) {
    c = c.replace(elseIf, 'console.error("[DEBUG elseIf] spec:", parsedBody.spec, "list:", appConfig.modelSpecs?.list?.length);\n' + elseIf);
    changed++;
}

// Add debug after result
var postApply = 'parsedBody = result.parsedBody;';
if (c.includes(postApply) && !c.includes('DEBUG after apply')) {
    c = c.replace(postApply, 'console.error("[DEBUG after apply]", JSON.stringify({parsedBody:result.parsedBody}));\n\t\t' + postApply);
    changed++;
}

fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', changed);
