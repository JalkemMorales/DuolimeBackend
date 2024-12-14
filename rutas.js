const express = require('express');
const FileHandler = require('./FileHandler');
const OpenAIHandler = require('./OpenAiHandler');
var router = express.Router();
var openai = new OpenAIHandler();
var files = new FileHandler();

router.post('/obtenerPregunta', async (req, res) => {
    res.status(200).send(await openai.requestMessage(req.body.tema));
});

router.post('/getProfile', async (req, res) => {
    res.send(await files.readPerfil()).status(200);
});

router.post('/registerProfile', async (req, res) => {
    res.send(await files.writePerfil(req.body.username, req.body.password)).status(200);
});

router.post('/getCategories', async (req, res) => {
    res.send(await files.readCategories()).status(200);
});

module.exports = router;