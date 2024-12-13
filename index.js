const express = require('express');
const bodyParser = require('body-parser');
const rutas = require('./rutas');
const cors = require('cors'); // Importa cors

const app = express();

// Middleware para CORS
app.use(cors({
    origin: 'http://localhost:4200', // Permitir solicitudes desde Angular
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'] // Encabezados permitidos
}));

// Middlewares de Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Registro de rutas
app.use('/', rutas);

// Inicio del servidor
app.listen(3000, (err) => {
    if (err) {
        console.log('Error al levantar el servidor: ' + err);
        return;
    }
    console.log('API Escuchando en el puerto 3000');
});
