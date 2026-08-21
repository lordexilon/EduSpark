var fs = require('fs');

// Load the librechat.yaml
var yaml = fs.readFileSync('/app/librechat.yaml', 'utf8');
console.log('Checking YAML for modelSpecs...');

// Simple YAML modelSpec parser
var inModelSpecs = false;
var currentSpec = null;
var specs = [];

yaml.split('\n').forEach(function(line) {
    if (line.match(/^\s*modelSpecs:/)) {
        inModelSpecs = true;
        return;
    }
    if (inModelSpecs) {
        var nameMatch = line.match(/^\s+-\s+name:\s+(.+)$/);
        if (nameMatch) {
            currentSpec = { name: nameMatch[1].trim() };
            specs.push(currentSpec);
            return;
        }
        if (currentSpec) {
            var presetMatch = line.match(/^\s+preset:\s*$/);
            if (presetMatch) {
                currentSpec.preset = {};
                return;
            }
            if (currentSpec.preset) {
                var kv = line.match(/^\s+(model|endpoint|modelLabel|temperature|topP|maxTokens):\s+(.+)$/);
                if (kv) {
                    currentSpec.preset[kv[1]] = kv[2].trim();
                }
            }
        }
    }
});

console.log(JSON.stringify(specs, null, 2));
