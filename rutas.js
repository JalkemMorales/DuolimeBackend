const express = require('express');
const FileHandler = require('./FileHandler');
const OpenAIHandler = require('./OpenAiHandler');
var router = express.Router();
var openai = new OpenAIHandler();
var files = new FileHandler();
const nodemailer = require('nodemailer');

router.post('/obtenerPregunta', async (req, res) => {
    res.status(200).send(await openai.requestMessage(req.body.tema));
});

router.post('/getProfile', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await files.readPerfil(username, password);
        if (user) {
            res.status(200).send(user);
        } else {
            res.status(401).send({ message: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        console.error('Error al verificar las credenciales:', error);
        res.status(500).send({ message: 'Error en el servidor.' });
    }
});

router.post('/getRanking', async (req, res) => {
  try {
      const puntaje = await files.readRanking();
      if (puntaje) {
          res.status(200).send(puntaje);
      } else {
          res.status(401).send('Error');
      }
  } catch (error) {
      console.error('Error al verificar el ranking:', error);
      res.status(500).send({ message: 'Error en el servidor.' });
  }
});

router.post('/getPuntaje', async (req, res) => {
  const { id, category } = req.body;
  try {
      const puntaje = await files.readPuntaje(id, category);
      if (puntaje) {
          res.status(200).send(puntaje);
      } else {
          res.status(401).send('0');
      }
  } catch (error) {
      console.error('Error al verificar las puntuaciones:', error);
      res.status(500).send({ message: 'Error en el servidor.' });
  }
});

router.post('/registerPuntaje', async (req, res) => {
  const { id, category, newscore } = req.body;

  try {
      console.log(`Id recibido: ${id}, Categoria recibida: ${category}`);
      await files.writePuntaje(id, category, newscore);
      res.status(200).send({ message: 'Puntaje registrado exitosamente' });
  } catch (error) {
      res.status(500).send({ message: 'Error al registrar puntaje', error });
  }
});

router.post('/registerProfile', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Log para mostrar el nombre de usuario y la contraseña recibidos
        console.log(`Nombre recibido: ${username}, Contraseña recibida: ${password}`);

        await files.writePerfil(username, password);
        
        res.status(200).send({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        res.status(500).send({ message: 'Error al registrar usuario', error });
    }
});


router.post('/enviarCorreo', async (req, res) => {
    const { email, password } = req.body;
  
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'duolime.mhvr@gmail.com',
        pass: 'gwrl gxna jvkf ayfp', // contraseña de aplicación
      },
    });
  
    const mailOptions = {
      from: 'duolime.mhvr@gmail.com',
      to: email,
      subject: 'Tu contraseña de acceso',
      text: `Hola, tu contraseña generada es: ${password}`,
    };
  
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Correo enviado:', info.response);
      res.status(200).send({ message: 'Correo enviado exitosamente' });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      res.status(500).send({ message: 'Error al enviar correo', error });
    }
  });
  


router.post('/getCategories', async (req, res) => {
    res.send(await files.readCategories()).status(200);
});

module.exports = router;