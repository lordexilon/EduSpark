var fs = require('fs');
var p = '/app/api/server/services/Endpoints/agents/build.js';
var c = fs.readFileSync(p, 'utf8');
if (!c.includes('fs = require')) {
    c = c.replace(
        "const { isAgentsEndpoint, removeNullishValues, Constants } = require('librechat-data-provider');",
        "const { isAgentsEndpoint, removeNullishValues, Constants } = require('librechat-data-provider');\nconst fs = require('fs');"
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Added fs require');
} else {
    console.log('fs require already present');
}
