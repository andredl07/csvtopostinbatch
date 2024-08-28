const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;
const bearerToken = 'bearer-aqui';

app.get('/process-csv', (req, res) => {
  const csvFilePath = path.resolve(req.query.directory, 'input.csv'); // Diretório fornecido via query string
  const results = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => {
      const body = {
        active: 1,
        address: {
          city: data.city,
          country: data.country,
          neighborhood: data.cityNeighborhood,
          state: data.state,
          street: data.street,
          zipCode: data.zipCode
        },
        alternativeIdentifier: data.alternativeIdentifier,
        corporateName: data.corporateName,
        description: data.description,
        customFields: []
      };

      Object.keys(data).forEach(key => {
        if (key.startsWith('CF_')) {
          const values = data[key].split('|');
          
          if (values.length > 1) {
            const valuesArray = values.map(value => ({ value }));
            body.customFields.push({
              alternativeIdentifier: key.replace('CF_', ''),
              values: valuesArray
            });
          } else {
            body.customFields.push({
              alternativeIdentifier: key.replace('CF_', ''),
              value: data[key]
            });
          }
        }
      });

      results.push({
        entity: "local",
        url: "https://api.umov.me/v2/local",
        method: "POST",
        body: body
      });
    })
    .on('end', () => {
      const output = {
        entity: "local",
        type: "TOTAL",
        operations: results
      };

      // Log do body que será enviado no POST
      console.log("Body que será enviado no POST:", JSON.stringify(output, null, 2));

      // Envia o POST para https://api.umov.me/v2/batch
      axios.post('https://api.umov.me/v2/batch', output, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        res.json({ status: 'success', data: response.data });
      })
      .catch(error => {
        res.status(500).json({ status: 'error', message: error.message });
      });
    });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
