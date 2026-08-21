var fs = require('fs');
var schemasPath = '/app/node_modules/@librechat/data-schemas/dist/index.cjs';
var c = fs.readFileSync(schemasPath, 'utf8');

// Remove the broken PROCESS_SPEC_DEBUG lines
c = c.replace(/\n\tconsole\.error\("\[PROCESS_SPEC_DEBUG\] input list length:.*/g, '');
c = c.replace(/\n\t\tconsole\.error\("\[PROCESS_SPEC_DEBUG\] checking spec:.*/g, '');
c = c.replace(/\n\t\tconsole\.error\("\[PROCESS_SPEC_DEBUG\] custom endpoint check for:.*/g, '');

fs.writeFileSync(schemasPath, c, 'utf8');
console.log('ProcessModelSpecs debug removed');
