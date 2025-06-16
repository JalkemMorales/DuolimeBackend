const express = require('express');

const FileHandler = require('./FileHandler');
const OpenAIHandler = require('./OpenAIHandler');
const MySQLHandler = require('./MySQLHandler');

var router = express.Router();
var openai = new OpenAIHandler();
var files = new FileHandler();
var mysql = new MySQLHandler();

const nodemailer = require('nodemailer');

router.post('/obtenerPregunta', async (req, res) => {
    res.status(200).send(await openai.requestMessage(req.body.tema));
});

router.post('/getProfile', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await mysql.readPerfil(username, password);
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

router.post('/getPopularCategories', async (req, res) => {
    try {
        const popularCategories = await mysql.readPopularCategories();
        res.status(200).json(popularCategories); // Devuelve las categorías populares como JSON
    } catch (error) {
        console.error('Error en la ruta /getPopularCategories:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener categorías populares.' });
    }
});

router.post('/getScoresByCategory', async (req, res) => {
    const { categoryId } = req.body;
    if (categoryId === undefined || categoryId === null) {
        return res.status(400).json({ message: 'El ID de la categoría (categoryId) es requerido en el cuerpo de la solicitud.' });
    }

    try {
        const scores = await mysql.readAllScoresByCategoryId(categoryId);
        res.status(200).json(scores);
    } catch (error) {
        console.error(`Error en la ruta /getScoresByCategory para ID ${categoryId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor al obtener puntajes por categoría.' });
    }
});

router.post('/getStreakRanking', async (req, res) => {
    try {
        const streakRanking = await mysql.readStreakRanking();
        res.status(200).json(streakRanking);
    } catch (error) {
        console.error('Error en la ruta /getStreakRanking:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el ranking de rachas.' });
    }
});

router.post('/getRanking', async (req, res) => {
  try {
    const ranking = await mysql.readGlobalRanking();
    if (ranking) {
      res.status(200).json(ranking);
    } else {
      res.status(404).json({ message: 'No se encontraron datos de ranking.' });
    }
  } catch (error) {
    console.error('Error al obtener el ranking global desde MySQL:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener el ranking global.' });
  }
});

router.post('/getProgress', async (req, res) => {
    const { id, category } = req.body;
    try {
        const progreso = await mysql.readProgreso(id, category);
        if (progreso) {
            res.status(200).send(progreso.toString());
        } else {
            res.status(401).send('Error');
        }
    } catch (error) {
        console.error('Error al verificar el progreso:', error);
        res.status(500).send({ message: 'Error en el servidor.' });
    }
  });

  router.post('/updateRacha', async (req, res) => {
    const { id } = req.body;
    try {

        const updatedStreak = await mysql.updateAndGetRacha(id); 
        res.status(200).send(updatedStreak); 
    } catch (error) {
        console.error('Error al procesar la racha:', error);
        res.status(500).send({ message: 'Error en el servidor al actualizar la racha.' });
    }
});

router.post('/getPuntaje', async (req, res) => {
  const { id, category } = req.body;
  try {
      const puntaje = await mysql.readPuntaje(id, category);
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

router.post('/getUsername', async (req, res) => {
    const { id } = req.body;
    try {
        const username = await files.readUsername(id);
        if (username) {
            res.status(200).send(username);
        } else {
            res.status(401).send('0');
        }
    } catch (error) {
        console.error('Error al verificar las puntuaciones:', error);
        res.status(500).send({ message: 'Error en el servidor.' });
    }
  });

router.post('/registerProgress', async (req, res) => {
    const { id, category, newlevel } = req.body;

    try {
        await mysql.writeProgress(id, category, newlevel);
        res.status(200).send({ message: 'Progreso registrado exitosamente' });
    } catch (error) {
        res.status(500).send({ message: 'Error al registrar el progreso: ', error });
    }
});

router.post('/registerPuntaje', async (req, res) => {
  const { id, category, newscore, level } = req.body;

  try {
      console.log(`Id recibido: ${id}, Categoria recibida: ${category}`);
      await mysql.writePuntaje(id, category, newscore, level);
      res.status(200).send({ message: 'Puntaje registrado exitosamente' });
  } catch (error) {
      res.status(500).send({ message: 'Error al registrar puntaje', error });
  }
});

router.post('/registerProfile', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Log para mostrar el nombre de usuario y la contraseña recibidos
        console.log(`Nombre recibido: ${username}, Contraseña recibida: ${password}`);

        await mysql.writePerfil(username, password, email);
        
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
    res.send(await mysql.readCategories()).status(200);
});

router.post('/getUserProfile', async (req, res) => {
    const { id } = req.body;
    try {
        const profileData = await mysql.readUserProfile(id);
        if (profileData) {
            res.status(200).json(profileData);
        } else {
            res.status(404).json({ message: 'Perfil no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener datos del perfil:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

router.post('/readAllProgressByUserId', async (req, res) => {
    const { id } = req.body;
    try {
        const progress = await mysql.readAllProgressByUserId(id);
        if (progress) {
            res.status(200).json(progress);
        } else {
            res.status(404).json({ message: 'Perfil no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener datos del perfil:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

module.exports = router;