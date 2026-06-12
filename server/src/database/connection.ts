import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private static instance: mysql.Pool | null = null;

  static getInstance(): mysql.Pool {
    if (!Database.instance) {
      Database.instance = mysql.createPool({
        host:               process.env.DB_HOST     || 'localhost',
        port:               Number(process.env.DB_PORT) || 3306,
        user:               process.env.DB_USER     || 'root',
        password:           process.env.DB_PASSWORD || '',
        database:           process.env.DB_NAME     || 'prm_tool',
        waitForConnections: true,
        connectionLimit:    10,
        queueLimit:         0,
        timezone:           '+00:00',
      });
    }
    return Database.instance;
  }
}

export const pool = Database.getInstance();
