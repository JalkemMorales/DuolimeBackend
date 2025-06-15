const mysql = require("mysql2");
const crypto = require("crypto");
const moment = require("moment");

class MySQLHandler {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "duolime",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    this.pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error al conectar a la base de datos:", err);
      } else {
        console.log("Conexión a la base de datos establecida.");
        connection.release();
      }
    });
  }

  async readPerfil(username, password) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT * FROM usuario 
                WHERE username = ? AND password = ?`,
        [username, password]
      );
      return rows[0] ? rows[0] : null;
    } catch (err) {
      console.error("Error al leer perfil:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readCategories() {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(`SELECT * FROM categoria;`);
      return rows ? rows : null;
    } catch (err) {
      console.error("Error al leer perfil:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readProgreso(userId, categoriaId) {
    const connection = await this.pool.promise().getConnection();
    try {
      // Consultar el nivel de progreso existente
      const [rows] = await connection.query(
        `SELECT level FROM progreso 
             WHERE Usuario_id = ? AND Categoria_id = ? ORDER BY level DESC`,
        [userId, categoriaId]
      );

      if (rows.length > 0) {
        console.log('DEVUELTO: ' + rows[0].level);
        return rows[0].level;
      } else {
        await this.writeProgress(userId, categoriaId, 1);
        return 1;
      }
    } catch (err) {
      console.error("Error al leer progreso:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async writeProgress(userId, categoriaId, newlevel) {
    const connection = await this.pool.promise().getConnection();
    try {
      await connection.query(
        `INSERT INTO progreso (Categoria_id, Usuario_id, level)
                 VALUES (?, ?, ?)`,
        [categoriaId, userId, newlevel]
      );
      console.log(
        `Progreso actualizado para usuario ${userId}, categoría ${categoriaId}: nivel ${newlevel}`
      );
    } catch (err) {
      console.error("Error al escribir progreso:", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  async readRacha(userId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT lastday, numstreak FROM racha 
         WHERE Usuario_id = ? FOR UPDATE`,
        [userId]
      );

      const today = moment().format("YYYY-MM-DD");
      const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");

      let newStreak = 1;

      if (rows.length > 0) {
        const { lastday, numstreak } = rows[0];

        if (lastday === today) {
          newStreak = numstreak;
        } else if (lastday === yesterday) {
          newStreak = numstreak + 1;
          await connection.query(
            `UPDATE racha SET lastday = ?, numstreak = ? 
             WHERE Usuario_id = ?`,
            [today, newStreak, userId]
          );
        } else {
          newStreak = 1;
          await connection.query(
            `UPDATE racha SET lastday = ?, numstreak = ? 
             WHERE Usuario_id = ?`,
            [today, newStreak, userId]
          );
        }
      } else {
        await connection.query(
          `INSERT INTO racha (Usuario_id, lastday, numstreak) 
           VALUES (?, ?, ?)`,
          [userId, today, newStreak]
        );
      }

      await connection.commit();
      return newStreak.toString();
    } catch (err) {
      if (connection) await connection.rollback();
      console.error("Error en readRacha:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readPuntaje(userId, categoriaId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT score FROM puntaje 
             WHERE Usuario_id = ? AND Categoria_id = ? ORDER BY score DESC`,
        [userId, categoriaId]
      );

      if (rows.length > 0) {
        console.log('Puntajes: ' + JSON.stringify(rows));
        return rows[0].score.toString();
      } else {
        return null;
      }
    } catch (err) {
      console.error("Error al leer puntaje:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async writePuntaje(userId, categoriaId, newscore, level) {
    let connection;
    try {
        connection = await this.pool.promise().getConnection();
        
        // Actualizar o insertar el puntaje
        await connection.query(
            `INSERT INTO puntaje (Usuario_id, Categoria_id, score, id, update_date, level)
             VALUES (?, ?, ?, UUID(), current_timestamp(), ?)
             ON DUPLICATE KEY UPDATE score = score + VALUES(score)`,
            [userId, categoriaId, newscore, level]
        );
        
        console.log(`Puntaje actualizado para usuario ${userId}, categoría ${categoriaId}: +${newscore} puntos`);
        
        // Calcular el puntaje total del usuario
        const [totalRows] = await connection.query(
            `SELECT SUM(score) as total FROM puntaje WHERE Usuario_id = ?`,
            [userId]
        );
        
        const totalScore = totalRows[0].total || 0;
        
        // Actualizar el ranking
        await this.writeRanking(userId, totalScore);
        
    } catch (err) {
        console.error("Error al escribir puntaje:", err);
        throw err;
    } finally {
        if (connection) connection.release();
    }
}

async writeRanking(userId, maxscore) {
    let connection;
    try {
        connection = await this.pool.promise().getConnection();
        
        // Actualizar o insertar en el ranking
        await connection.query(
            `INSERT INTO ranking (Usuario_id, maxscore)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE maxscore = VALUES(maxscore)`,
            [userId, maxscore]
        );
        
        console.log(`Ranking actualizado para usuario ${userId}: maxscore ${maxscore}`);
    } catch (err) {
        console.error("Error al escribir ranking:", err);
        throw err;
    } finally {
        if (connection) connection.release();
    }
}
}

module.exports = MySQLHandler;
