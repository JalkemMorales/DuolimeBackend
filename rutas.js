const express = require('express');

const { body, param, validationResult } = require('express-validator');
const OpenAIHandler = require('./OpenAIHandler');
var router = express.Router();
var openai = new OpenAIHandler();

router.post('/obtenerPregunta', (req, res) => {
    //TODO: Handler
    openai.requestMessage();
});

module.exports = router;