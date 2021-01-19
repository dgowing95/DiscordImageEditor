var request = require('request')
var Jimp = require('jimp');
var Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const AWS = require('aws-sdk');
const Meme = require('./controllers/Meme.js');
AWS.config.update({region: 'EU-WEST-2', accessKeyId: process.env.accessKeyID, secretAccessKey: process.env.secretAccessKey});

const DatabaseController = require('./controllers/database.js');
var db = new DatabaseController();


const prefix = '!ezm';
const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/gif',
    'image/pjpeg',
    'image/tiff'
];

// const fontsAvailable = [
//     Jimp.FONT_SANS_8_BLACK,
//     Jimp.FONT_SANS_10_BLACK,
//     Jimp.FONT_SANS_12_BLACK,
//     Jimp.FONT_SANS_14_BLACK,
//     Jimp.FONT_SANS_16_BLACK,
//     Jimp.FONT_SANS_32_BLACK,
//     Jimp.FONT_SANS_64_BLACK,
//     Jimp.FONT_SANS_128_BLACK,
// ].reverse();

client.on("guildCreate", guild => {
    db.addGuild(guild.id, (success) => {
        if (success) {
            console.log(`${guild.name} has just added the bot.`)
        }
    })
})

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    db.connect();
})

client.on('error', (err) => {
    console.error(err);
})

client.on('message', msg => {
    if (!msg.content.toLowerCase().startsWith(prefix) || msg.author.bot) {
        return;
    }

    let args = msg.content.slice(prefix.length).trim().split(/ +/);
    let cmd = args.shift();
    
    db.isChannelBlocked(msg.guild.id, msg.channel.id, (blocked) => {
        if (blocked && cmd !== 'unblock'){
            return;
        }
        let data = args;
        handleCommand(cmd, msg, data);
    })
    
    

})

client.login(process.env.token);

function handleCommand(cmd, msg, data) {
    switch (cmd) {
        case 'list' :
            listTemplates(msg);
            break;
        case 'block' :
            blockChannel(msg);
            break;
        case 'unblock' :
            unblockChannel(msg);
            break;
        case 'remove' :
            disableTemplate(msg, data)
            break;
        case 'add' :
            atCapacity(msg.guild.id, (val) => {
                if (val) {
                    msg.reply('This server has reached the maximum number of templates. Please remove some with !ezm remove template-name in order to add more.');
                    return;
                } else {
                    addTemplate(msg, data);
                }
                
            });
            
            break;
        default:
            if (data.length < 1) {
                msg.reply('Please provide some text for the meme. !ezm template text to add');
                return;
            }
            let text = data.join(' ');
            memeMaker(msg, cmd, text)

            
    }
}

function blockChannel(msg) {
    let member = msg.member;
    if (!member.hasPermission('MANAGE_CHANNELS')) {
        return;
    }
    let channelID = msg.channel.id;

    db.blockChannelInGuild(msg.channel.guild.id, channelID, (success) => {
        if (success) {
            msg.channel.send('EZMeme will no longer watch this channel for memes.');
        }
    })

}

function unblockChannel(msg) {
    let member = msg.member;
    if (!member.hasPermission('MANAGE_CHANNELS')) {
        return;
    }
    let channelID = msg.channel.id;

    db.removeBlockedChannel(msg.channel.guild.id, channelID, (success) => {
        if (success) {
            msg.channel.send('EZMeme is now tracking this channel for memes');
        }
    })
}

function disableTemplate(msg, data) {
    db.disableTemplate(msg.guild.id, data, (rowAffected) => {
        if (rowAffected) {
            msg.channel.send(`${data} has been removed from your templates.`);
        } else {
            msg.channel.send(`You dont have a template called ${data}`);
        }
    })
}

function atCapacity(guildID, callback) {
    db.getGuildCapacity(guildID, (capacity) => {
        db.countTemplates(guildID, (count) => {
            callback(count >= capacity);
        })
    })
}

async function addTemplate(msg, data) {
    if (msg.attachments.size !== 1) {
        msg.reply('You need to attach an image along with the message. !ezm add template-name');
        return;
    }

    let image = msg.attachments.first();

    if (image.size == null || (image.size /1000) > 10000 ) {
        msg.reply('Filesize too large, please reduce the size of the image and try again.')
        return;
    }

    //Remove spaces from the name they've given this template
    let templateName = data.join('-');
    if (! /^[0-9a-zA-Z\-]+$/.test(templateName)) {
        msg.reply('Please only use letters and numbers in your template names.')
        return;
    }
    let isUnique = await db.isTemplateNameUnique(templateName, msg.guild.id);

    if (!isUnique) {
        msg.reply('A template already exists with that name. Try naming it something else or remove the old template. !ezm remove template-name');
        return;
    }

    //Retrieve the URL from discord. Sometimes it's proxied
    let url = '';
    if ("proxyURL" in image) {
        url = image.proxyURL;
    } else {
        url = image.url;
    }

    //Create the key we'll name this template as on S3
    //Prefix with the guild id and then we'll just reuse the file name
    let objectKey = `${msg.guild.id}/${image.name}`


    UploadFromUrlToS3(
    url,
    objectKey,
    function(success) {
        if (success) {
            //Store reference in database & output message to channel
            db.storeTemplate(msg.guild.id, templateName, objectKey, msg.author.id, () => {
                msg.channel.send(`Template ${templateName} is now ready. Use '!ezm ${templateName} your text here' to use it!`)
                msg.delete();
            })
        } else {
            msg.channel.send("I'm not able to process those sorts of files. Please make sure you're uploading images.");
        }


    });

}


function UploadFromUrlToS3(url,destPath, callback){

    request({
        url: url,
        encoding: null
    }, function(err, res, body) {
        if (err) {throw err;}

        //Check mime type of file
        require('file-type').fromBuffer(body)
        .then((value) => {
            //file-type returns undefined if it cannot find a match
            if (value == null) {
                callback(false);
                return;
            }

            //Check if mime matches allowed types
            let filetype = value.mime;
            if (allowedTypes.includes(filetype)) {
                //upload to s3
                new AWS.S3().putObject({
                    Bucket: 'ezmeme-templates',
                    Key: destPath,
                    Body: body,
                    ContentType: res.headers['content-type'],
                    ContentLength: res.headers['content-length']
                }, (err, data) => {
                    if (err) {throw err;}
                    callback(true);
                })
            } else {
                callback(false);
            }
        })
        .catch(err => {throw err});



    })

}


function listTemplates(msg) {
    let message = 'Available templates are: \n';

    db.listTemplates(msg.guild.id)

    .then((templates) => {
        message += templates.map((name) => {
            return name + '\n'
        }).join('');
        return message;
    })

    .then((message) => {
        msg.channel.send(message);
    })

    .catch((err) => {
        console.log(err);
    })
}

function memeMaker(msg, imageTemplate, text) {
    let message = msg;
    msg.delete();
    //Retrieve the template from the database
    db.retrieveTemplate(imageTemplate, message.guild.id)

    .then((objectKey) => {
        //Attempt to retrieve an object from S3 with the db's returned key name
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3();
            s3.getObject({
                Bucket: 'ezmeme-templates',
                Key: objectKey
            }, function(err, data) {
    
                //if no object returned, throw error
                if (err) {reject (err)}
                resolve(data.Body);
            })
        })
    })
    .then( async(imageBuffer) => {
        let meme = new Meme(db, message.member.id);
        await meme.registerFonts();
        meme.loadImage(imageBuffer)
        .then(async() => {
            await meme.getUserConfs();
            meme.writeText(text)
        })
        .then(() => {
            message.channel.send({
                files: [
                    meme.exportBuffer()
                ]
            })
        })
        .catch((err) => console.log('General Meme Error:' + err))
    })
    .catch (err => {
        console.log('Template load error: ' + err);
    })

}



async function selectFont(img, text) {
    let width = img.bitmap.width;
    let height = img.bitmap.height;


    //Loop through largest to smallest font to select the best option
    let font = fontsAvailable[0];
    
    for (let i = 0; i < fontsAvailable.length; i++) {
        let textHeight = height;
        try {
            textHeight = await measureFont(fontsAvailable[i], text, width);
        } catch (err) {
            console.log(err);
        }
        
        if (textHeight < height) {
            font = fontsAvailable[i];
            break;
        }
    }
    return font;
}


function measureFont(font, text, imageWidth) {
    return new Promise((resolve, reject) => {
        Jimp.loadFont(font)
        .then(font => {
            return Jimp.measureTextHeight(font, text, imageWidth-40)
        })
        .then(height => {
            resolve(height);
        })
        .catch(err => {
            reject(err);
        })
    })

}

function AddTextToImage(textSettings, image) {
    return new Promise((resolve, reject) => {
        Jimp.read(image)
        .then(async(img) => {
            let fontToUse
            try {
                fontToUse = await selectFont(img, textSettings.text);
            } catch (error) {
                fontToUse = fontsAvailable[0];
                console.log(error);
            }
            return Jimp.loadFont(fontToUse).then(font => ([img, font]))
        })
        .then(async (data) => {
            tpl = data[0];
            font = data[1];
    
            let maxWidth = tpl.bitmap.width - 40;

            let transparentLayer = await Jimp.create(tpl.bitmap.width, tpl.bitmap.height);
            let textLayer = await transparentLayer.print(font,textSettings.placementX, textSettings.placementY, {
                text: textSettings.text,
                alignmentX: textSettings.alignmentX,
                alignmentY: 0
            }, maxWidth, tpl.bitmap.height);

            textLayer.color([{ apply: 'xor', params: ['#ffffff'] }]);
    
            return tpl.blit(textLayer,0,0);
    
        })

        .then(tpl => (tpl.getBufferAsync(Jimp.MIME_JPEG)))
        .then(imageBuffer => { 
            console.log('Image generated');
            resolve(imageBuffer);
          })
        .catch(err => {
            reject(err);
        })
    })

}
