const lp = require("librechat-data-provider");
const schema = lp.compactAgentsSchema;
console.log("Schema fields:", Object.keys(schema.shape || {}));
const s2 = lp.agentsSchema;
console.log("agentsSchema fields:", Object.keys(s2.shape || {}));
