const fs = require('fs'); const code = fs.readFileSync('d:/pfGG/auto_flow/assets/naming-Bysx_Vg_.js', 'utf8'); console.log(code.match(/https:\/\/[^\x22]+/g));
