# CSV to JSON Processor

## Descrição

Esta aplicação Node.js lê um arquivo CSV linha por linha, transforma os dados em um objeto JSON formatado de acordo com um padrão específico e envia os dados em uma requisição POST para uma API. A aplicação é configurada para rodar localmente usando o framework Express.

## Funcionalidades

- Lê um arquivo CSV de um diretório especificado.
- Gera um JSON de saída com a estrutura especificada, incluindo campos customizados.
- Faz um POST do JSON gerado para a API `em lote` usando um Bearer Token fixo.
- Inclui logs no terminal que mostram o JSON que será enviado na requisição POST.

## Requisitos

- Node.js
- npm

## Instalação

1. Clone este repositório.
2. Navegue até o diretório do projeto.
3. Instale as dependências necessárias executando o comando:
   ```bash
   npm install
