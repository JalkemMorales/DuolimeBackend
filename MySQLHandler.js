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
      const [rows] = await connection.query(
        `SELECT * FROM categoria;`,
      );
      return rows ? rows : null;
    } catch (err) {
      console.error("Error al leer perfil:", err);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = MySQLHandler;
