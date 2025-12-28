const fs = require('fs');

fetch('https://freeipapi.com/api/json')
    .then(r => r.json())
    .then(d => {
        fs.writeFileSync('ip-result.txt', JSON.stringify(d, null, 2));
    })
    .catch(e => console.error(e));
