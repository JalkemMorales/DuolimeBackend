const express = require('express');

const { body, param, validationResult } = require('express-validator');
const OpenAIHandler = require('./OpenAIHandler');
var router = express.Router();
var openai = new OpenAIHandler();

router.post('/obtenerPregunta', async (req, res) => {
    //TODO: Handler
    
    res.status(200).send(await openai.requestMessage(req.body.tema));
});

module.exports = router;