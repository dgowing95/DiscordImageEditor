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
        //guildID, name, base64, user

        // let guildID = 69;
        // let name = 'firstMeme';
        // let image = 'fdfdfdf';
        // let user = 'Me';


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
                }
                if (results) {
                    console.log(results);
                } else {
                    console.log('no output');
                }
            }
        );
    }
}
module.exports = DatabaseController;