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
      const [rows] = await connection.query(`SELECT id, name FROM categoria;`);
      return rows ? rows : null;
    } catch (err) {
      console.error("Error al leer categorias:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readAllScoresByCategoryId(categoriaId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT
            u.username,
            p.score
         FROM
            puntaje p
         JOIN
            usuario u ON p.Usuario_id = u.id
         WHERE
            p.Categoria_id = ?
         ORDER BY
            p.score DESC`,
        [categoriaId]
      );
      return rows || [];
    } catch (err) {
      console.error(
        `Error al leer todos los puntajes para la categoría ${categoriaId}:`,
        err
      );
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readGlobalRanking() {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT
            u.username,
            r.Usuario_id,
            r.maxscore AS total_score_global
         FROM
            ranking r
         JOIN
            usuario u ON r.Usuario_id = u.id
         ORDER BY
            r.maxscore DESC, u.username ASC`
      );
      return rows || [];
    } catch (err) {
      console.error(
        "Error al leer el ranking global (desde tabla 'ranking'):",
        err
      );
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readStreakRanking() {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT
            u.username,
            r.numstreak AS streak_count
         FROM
            racha r
         JOIN
            usuario u ON r.Usuario_id = u.id
         ORDER BY
            r.numstreak DESC, u.username ASC`
      );
      return rows || [];
    } catch (err) {
      console.error("Error al leer el ranking de rachas:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readPopularCategories() {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT
            c.id AS category_id,
            c.name AS category_name,
            COALESCE(SUM(p.score), 0) AS total_score
         FROM
            categoria c
         LEFT JOIN
            puntaje p ON c.id = p.Categoria_id
         GROUP BY
            c.id, c.name
         ORDER BY
            total_score DESC, c.name ASC;`
      );
      return rows || []; // Retorna un array vacío si no hay resultados
    } catch (err) {
      console.error("Error al leer categorías populares:", err);
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
        console.log("DEVUELTO: " + rows[0].level);
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

  async updateAndGetRacha(userId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      await connection.beginTransaction();
      console.log(
        `[Racha Logic - Simplified] START: Processing racha for userId: ${userId}`
      );
      const [rows] = await connection.query(
        `SELECT lastday, numstreak FROM racha 
         WHERE Usuario_id = ? FOR UPDATE`,
        [userId]
      );

      console.log(
        `[Racha Logic - Simplified] DB Query Result for userId ${userId}:`,
        rows
      );
      const today = moment().format("YYYY-MM-DD");
      let newStreak = 1;
      if (rows.length > 0) {
        const { lastday, numstreak } = rows[0];
        const dbLastDayFormatted = moment(lastday).format("YYYY-MM-DD");

        console.log(
          `[Racha Logic - Simplified] Existing Streak Found: lastday=${dbLastDayFormatted}, numstreak=${numstreak}`
        );

        if (dbLastDayFormatted === today) {
          newStreak = numstreak;
          console.log(
            `[Racha Logic - Simplified] Condition: lastday === today. Streak remains: ${newStreak}`
          );
        } else {
          newStreak = numstreak + 1;
          await connection.query(
            `UPDATE racha SET lastday = ?, numstreak = ? 
             WHERE Usuario_id = ?`,
            [today, newStreak, userId]
          );
          console.log(
            `[Racha Logic - Simplified] Condition: User active today for first time. Streak incremented to: ${newStreak}`
          );
        }
      } else {
        await connection.query(
          `INSERT INTO racha (Usuario_id, lastday, numstreak) 
           VALUES (?, ?, ?)`,
          [userId, today, newStreak]
        );
        console.log(
          `[Racha Logic - Simplified] No existing streak entry. Inserted new streak: ${newStreak}`
        );
      }

      await connection.commit();
      console.log(
        `[Racha Logic - Simplified] END: Transaction committed. Returning newStreak: ${newStreak}`
      );
      return newStreak.toString();
    } catch (err) {
      if (connection) await connection.rollback();
      console.error(
        "[Racha Logic - Simplified] CRITICAL ERROR in updateAndGetRacha:",
        err
      );
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
        console.log("Puntajes: " + JSON.stringify(rows));
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

      console.log(
        `Puntaje actualizado para usuario ${userId}, categoría ${categoriaId}: +${newscore} puntos`
      );

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

   async readAllScoresByCategoryId(categoriaId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();
      const [rows] = await connection.query(
        `SELECT
                u.username,
                SUM(p.score) AS score_total_por_categoria
             FROM
                puntaje p
             JOIN
                usuario u ON p.Usuario_id = u.id
             WHERE
                p.Categoria_id = ?
             GROUP BY
                u.username
             ORDER BY
                score_total_por_categoria DESC`,
        [categoriaId]
      );
      // Aseguramos que siempre retorne un array, incluso si está vacío.
      return rows || [];
    } catch (err) {
      console.error(`Error al leer puntajes sumados por Categoría ${categoriaId}:`, err);
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

      console.log(
        `Ranking actualizado para usuario ${userId}: maxscore ${maxscore}`
      );
    } catch (err) {
      console.error("Error al escribir ranking:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async writePerfil(username, password, email) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();

      // Insertar el nuevo usuario con UUID generado por MySQL
      const [result] = await connection.query(
        `INSERT INTO usuario (id, username, password, email, upload_date) 
             VALUES (UUID(), ?, ?, ?, current_timestamp())`,
        [username, password, email]
      );

      console.log(`Usuario ${username} registrado exitosamente.`);
      return result.insertId; // Aunque en MySQL con UUID no es el ID numérico
    } catch (err) {
      // Manejar error de usuario duplicado
      if (err.code === "ER_DUP_ENTRY") {
        throw new Error("El nombre de usuario ya existe");
      }
      console.error("Error al registrar usuario:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async readUserProfile(userId) {
    let connection;
    try {
      connection = await this.pool.promise().getConnection();

      // 1. Datos básicos del usuario
      const [userRows] = await connection.query(
        `SELECT username, email, upload_date FROM usuario WHERE id = ?`,
        [userId]
      );
      if (userRows.length === 0) return null;
      const userData = userRows[0];

      // 2. Racha actual
      const [streakRows] = await connection.query(
        `SELECT numstreak FROM racha WHERE Usuario_id = ?`,
        [userId]
      );
      userData.streak = streakRows.length > 0 ? streakRows[0].numstreak : 0;

      // 3. Puntaje global (ranking)
      const [rankingRows] = await connection.query(
        `SELECT maxscore FROM ranking WHERE Usuario_id = ?`,
        [userId]
      );
      userData.globalScore =
        rankingRows.length > 0 ? rankingRows[0].maxscore : 0;

      // 4. Puntajes por categoría
      const [categoryScores] = await connection.query(
        `SELECT c.name AS category_name, p.score 
             FROM puntaje p
             JOIN categoria c ON p.Categoria_id = c.id
             WHERE p.Usuario_id = ?
             ORDER BY p.score DESC`,
        [userId]
      );
      userData.categoryScores = categoryScores;

      // 5. Posición en el ranking global
      const [rankingPosition] = await connection.query(
        `SELECT position FROM (
                SELECT Usuario_id, ROW_NUMBER() OVER (ORDER BY maxscore DESC) AS position 
                FROM ranking
            ) AS ranked 
            WHERE Usuario_id = ?`,
        [userId]
      );
      userData.rankingPosition =
        rankingPosition.length > 0 ? rankingPosition[0].position : "N/A";

      return userData;
    } catch (err) {
      console.error("Error al leer perfil de usuario:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = MySQLHandler;
