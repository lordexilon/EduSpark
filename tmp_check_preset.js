const lp = require("librechat-data-provider");
const schema = lp.tModelSpecPresetSchema;
console.log("Preset schema:", JSON.stringify(schema, null, 2).substring(0, 3000));
