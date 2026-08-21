var fs = require('fs');
var path = '/app/api/server/middleware/buildEndpointOption.js';
var c = fs.readFileSync(path, 'utf8');
var changed = 0;

// Remove the bad debug lines from the first if branch
var badLine1 = '      console.error("[DEBUG after apply]", JSON.stringify({parsedBody:result.parsedBody}));\n';
var badLine2 = '  console.error("[DEBUG elseIf] spec:", parsedBody.spec, "list:", appConfig.modelSpecs?.list?.length);\n';

if (c.includes(badLine1)) {
    c = c.replace(badLine1, '');
    changed++;
}
if (c.includes(badLine2)) {
    c = c.replace(badLine2, '');
    changed++;
}

fs.writeFileSync(path, c, 'utf8');
console.log('Changes:', changed);
