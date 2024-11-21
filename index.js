const express = require('express');
const bodyParser = require('body-parser');
const rutas = require('./rutas');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', rutas);

app.listen(3000, (err, res) => {
    if(err){
        console.log('Error al levantar el servidor: ' + err);
        return;
    }
    console.log('API Escuchando en el puerto 3000');
})