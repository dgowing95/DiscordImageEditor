class DatabaseController {
    constructor() {
        this.mysql = require('mysql');
    }

    getConnection() {
        if (this.con) {
            return this.con;
        }
        this.con = this.mysql.createConnection({
            host: process.env.db_host,
            user: process.env.db_user,
            password: process.env.db_pass,
            database: process.env.db_name
        });
        this.con.connect(function(err) {
            if (err) throw err;
            console.log('Connected to database');
        })
    }   

     connect() {
        this.getConnection();
    }

    storeTemplate(guildID, name, image, user) {
        let conn = this.getConnection();
        conn.query(
            'INSERT INTO templates (gid, name, file, user) VALUES (?, ?, ?, ?)',
            [
                guildID,
                name,
                image,
                user
            ],
            function (error, results, fields) {
                if (error) {
                    throw error;
                    return false;
                }
                if (results) {
                    return true;
                }
            }
        );
    }

    retrieveTemplate(templateName, guildID, callback) {
        let conn = this.getConnection();
        conn.query(
            'SELECT file FROM templates WHERE name = ? AND gid = ? LIMIT 1',
            [
                templateName,
                guildID
            ],
            function(error, results, fields) {
                if (error) { throw error; }
                if (results) {
                    callback(results[0].file)
                    return;
                } else {
                    return null;
                }
            }
        )
    }
}
module.exports = DatabaseController;