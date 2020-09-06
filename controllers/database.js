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

        //Keep DB connection alive
        setInterval(function () {
            this.con.query('SELECT 1');
        }.bind(this), 5000);
    }

    storeTemplate(guildID, name, image, user, callback) {
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
                }
                callback();
            }
        );
    }

    retrieveTemplate(templateName, guildID, callback) {
        let conn = this.getConnection();
        conn.query(
            'SELECT file FROM templates WHERE name = ? AND gid = ? AND active = 1 LIMIT 1 ',
            [
                templateName,
                guildID
            ],
            function(error, results, fields) {
                if (error) { throw error; }
                if (results.length > 0) {
                    callback(results[0].file)
                } else {

                    callback(false);
                }
            }
        )
    }

    countTemplates(guildID, callback) {
        let conn = this.getConnection();

        conn.query(
            'SELECT count(id) as total FROM templates WHERE gid = ? AND active = 1', 
            guildID,
            function(error, results, fields) {
                if (error || results.length == 0) {
                    if (error) { throw error; }
                    return false;
                } else {
                    callback(results[0].total);
                }
            }
        )
    }

    listTemplates(guildID, callback) {
        let conn = this.getConnection();

        conn.query(
            'SELECT name FROM templates WHERE gid = ? AND active = 1', 
            guildID,
            function(error, results, fields) {
                if (error || !results) {
                    if (error) { throw error; }
                    return false;
                } else {
                    let names = results.map( (row) => {
                        return row.name;
                    })
                    callback(names);
                }
            }
        )
    }

    disableTemplate(guildID, template, callback) {
        let conn = this.getConnection();

        conn.query(
            'UPDATE templates SET active = 0 WHERE name = ? AND gid = ? AND active = 1',
            [
                template,
                guildID
            ],
            function (error, results, fields) {
                if (error) { throw error; }
                //check if row affected
                if (results.affectedRows == 1) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        )
    }

    addGuild(guildID, callback) {
        let conn = this.getConnection();

        conn.query(
            'INSERT INTO guilds (gid) VALUES (?)',
            guildID,
            function (error, results, fields) {
                if (results.affectedRows == 1) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        )
    }

    getGuildCapacity(guildID, callback) {
        let conn = this.getConnection();

        conn.query(
            'SELECT capacity FROM guilds WHERE gid = ?',
            guildID,
            function (error, results, fields) {
                if (error) {throw error;}
                callback(results[0].capacity);
            }
        )
    }


    blockChannelInGuild(guildID, channelID, callback) {
        let conn = this.getConnection();

        conn.query(
            'INSERT INTO blocked_channels (gid, channel_id) VALUES (?,?)',
            [   
                guildID,
                channelID
            ],
            function (error, results, fields) {
                if (results.affectedRows == 1) {
                    callback(true);
                } else {
                    callback(false);
                } 
            }
        )
    }

    isChannelBlocked(guildID, channelID, callback) {
        let conn = this.getConnection();

        conn.query(
            'SELECT channel_id FROM blocked_channels WHERE gid = ? AND channel_id = ? LIMIT 1',
            [   
                guildID,
                channelID
            ],
            function (error, results, fields) {

                if (results.length == 0) { callback(false); return; }
                callback(true);
            }
        )
    }

    removeBlockedChannel(guildID, channelID, callback) {
        let conn = this.getConnection();

        conn.query(
            'DELETE FROM blocked_channels WHERE gid = ? AND channel_id = ?',
            [   
                guildID,
                channelID
            ],
            function (error, results, fields) {
                if (results.affectedRows == 1) {
                    callback(true);
                } else {
                    callback(false);
                } 
            }
        )
    }

}
module.exports = DatabaseController;