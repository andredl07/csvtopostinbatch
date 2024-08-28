const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');

const app = express();
const port = 3000;
const bearerToken = 'bearer-aqui';
const logFilePath = path.resolve(__dirname, 'request_log.txt');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logRequestId(fileName, id) {
  const logMessage = `${fileName} - Request ID: ${id} - ${new Date().toISOString()}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

async function processCSVFile(filePath) {
  const results = [];
  let lineCount = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        lineCount++;
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
      .on('end', async () => {
        console.log(`Arquivo ${path.basename(filePath)} - Linhas lidas: ${lineCount}`);

        const output = {
          entity: "local",
          type: "TOTAL",
          operations: results
        };

        // Log do body que será enviado no POST
        console.log("Body que será enviado no POST:", JSON.stringify(output, null, 2));

        // Envia o POST para https://api.umov.me/v2/batch
        try {
          const response = await axios.post('https://api.umov.me/v2/batch', output, {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              'Content-Type': 'application/json'
            }
          });
          const requestId = response.data.identifier.id;
          console.log(`Request ID retornado pela API: ${requestId}`);
          logRequestId(path.basename(filePath), requestId);
          resolve(requestId);
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function renameFile(oldPath) {
  const dir = path.dirname(oldPath);
  const ext = path.extname(oldPath);
  const baseName = path.basename(oldPath, ext);
  const newPath = path.join(dir, `${baseName}(upload)${ext}`);

  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(newPath);
      }
    });
  });
}

async function alreadyProcessed(fileName) {
  const logContent = fs.readFileSync(logFilePath, 'utf8');
  return logContent.includes(fileName);
}

app.get('/process-csv', async (req, res) => {
  try {
    const directory = req.query.directory;
    const files = fs.readdirSync(directory).filter(file => file.startsWith('LOC') && file.endsWith('_v2.csv'));

    const feedback = [];

    for (const file of files) {
      if (await alreadyProcessed(file)) {
        console.log(`Arquivo ${file} já foi processado anteriormente. Pulando...`);
        continue;
      }

      const filePath = path.resolve(directory, file);
      const requestId = await processCSVFile(filePath);
      feedback.push({ file, requestId });

      console.log(`Processamento de ${file} concluído. Renomeando arquivo...`);
      const newFilePath = await renameFile(filePath);
      console.log(`Arquivo renomeado para: ${newFilePath}`);
      console.log(`Aguardando 5 minutos para o próximo arquivo...`);
      await delay(5 * 60 * 1000); // Aguarda 5 minutos
    }

    res.json({ status: 'success', message: 'Todos os arquivos processados com sucesso.', feedback });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
