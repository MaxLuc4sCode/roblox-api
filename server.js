// =================================================================
// 1. IMPORTAÇÕES - Trazendo as ferramentas que instalamos
// =================================================================
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Esta linha DEVE vir no início para carregar o .env

// =================================================================
// 2. CONFIGURAÇÃO INICIAL
// =================================================================
const app = express(); // 'app' é a nossa aplicação Express
app.use(express.json()); // Middleware ESSENCIAL: Faz o Express entender JSON vindo no corpo das requisições

// =================================================================
// 3. VARIÁVEIS DE AMBIENTE - Lendo os segredos do arquivo .env
// =================================================================
const port = process.env.PORT || 3000; // A porta onde o servidor vai rodar
const mongoUri = process.env.MONGO_URI; // Nossa string de conexão com o banco
const apiKey = process.env.API_KEY;     // Nossa chave secreta para autorização

// =================================================================
// 4. CLIENTE DO MONGODB - Preparando a conexão com o banco
// =================================================================
const client = new MongoClient(mongoUri);

// =================================================================
// 5. MIDDLEWARE DE SEGURANÇA - Nosso "porteiro"
// =================================================================
// Uma função que roda ANTES de cada requisição para verificar se ela é válida
const requireApiKey = (req, res, next) => {
    // Pegamos a chave enviada pelo Roblox no cabeçalho 'x-api-key'
    const providedKey = req.header('x-api-key');
    // Verificamos se a chave existe e se é igual à nossa chave secreta
    if (providedKey && providedKey === apiKey) {
        next(); // Se a chave estiver correta, a requisição pode continuar
    } else {
        // Se a chave estiver errada ou ausente, enviamos um erro "Não Autorizado"
        res.status(401).json({ error: 'Acesso não autorizado.' });
    }
};

// =================================================================
// 6. ENDPOINTS (Rotas) - As URLs da nossa API
// =================================================================
// Definimos um endpoint que aceita requisições POST na URL '/submit-form'
// Note que passamos nosso "porteiro" (requireApiKey) antes da função principal
app.post('/submit-form', requireApiKey, async (req, res) => {
    // Usamos try/catch/finally para lidar com sucessos e erros de forma robusta
    try {
        // Conecta ao nosso cluster do MongoDB
        await client.connect();
        console.log("Conectado ao MongoDB!");

        // Seleciona o banco de dados e a coleção onde vamos salvar
        const database = client.db("meuJogoRobloxDB"); // Use o nome do seu DB
        const collection = database.collection("formularios");

        // Montamos o documento que será salvo, usando os dados que o Roblox enviou (req.body)
        const formData = {
            playerId: req.body.playerId, // ID do jogador
            formName: req.body.formName, // Nome do formulário
            data: req.body.data,         // Tabela com as respostas
            submittedAt: new Date()      // Data e hora de quando foi salvo
        };

        // Inserimos o documento na coleção
        const result = await collection.insertOne(formData);
        console.log(`Documento inserido com o ID: ${result.insertedId}`);

        // Enviamos uma resposta de sucesso (status 201 = Criado) de volta para o Roblox
        res.status(201).json({ success: true, message: 'Dados salvos com sucesso!' });

    } catch (error) {
        // Se qualquer coisa no 'try' der errado, capturamos o erro aqui
        console.error("Erro ao processar a requisição:", error);
        // Enviamos uma resposta de erro (status 500 = Erro Interno do Servidor)
        res.status(500).json({ success: false, message: 'Erro interno ao salvar os dados.' });
    } finally {
        // Este bloco SEMPRE roda, tendo dado sucesso ou erro
        // É crucial para garantir que a conexão com o banco de dados seja fechada
        await client.close();
        console.log("Conexão com o MongoDB fechada.");
    }
});


// =================================================================
// 7. INICIANDO O SERVIDOR
// =================================================================
// Faz nossa aplicação 'escutar' por requisições na porta definida
app.listen(port, () => {
    console.log(`Servidor da API rodando em http://localhost:${port}`);
});