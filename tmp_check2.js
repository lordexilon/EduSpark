const lp = require("librechat-data-provider");
const schema = lp.compactAgentsSchema;
console.log("Schema:", JSON.stringify(schema, null, 2).substring(0, 2000));
