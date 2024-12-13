const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

class OpenAIHandler {


    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            project: process.env.PROJECT_ID,
            organization: process.env.ORGANIZATION_ID
        });
    }

    async requestMessage(tema) {
        const response = await this.client.chat.completions.create({
            messages: [{
                role: 'user',
                content: 'Envia en formato JSON un arreglo de 10 objetos que contengan un campo "pregunta" con una pregunta sobre' + tema + 'estilo Verdadero o falso, y en otro campo llamado "respuesta" la respuesta correcta con una V para verdadero o una F para falso'
            }],
            response_format: {
                type: 'json_object',
            },
            model: 'gpt-3.5-turbo-0125'
        });
        console.log(response.choices[0].message.content);
        return (response.choices[0].message.content);
    }
}

module.exports = OpenAIHandler;