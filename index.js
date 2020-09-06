var request = require('request')
var Jimp = require('jimp');
var Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'EU-WEST-2', accessKeyId: process.env.accessKeyID, secretAccessKey: process.env.secretAccessKey});

const DatabaseController = require('./controllers/database.js');
var db = new DatabaseController();
const { rejects } = require('assert');

const prefix = '!ezm';
const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/gif',
    'image/pjpeg',
    'image/tiff'
];


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
    let data = args;
    handleCommand(cmd, msg, data);

})

client.login(process.env.token);

function handleCommand(cmd, msg, data) {
    switch (cmd) {
        case 'list' :
            listTemplates(msg);
            break;
        case 'remove' :
            disableTemplate(msg, data)
            break;
        case 'add' :
            addTemplate(msg, data);
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

function disableTemplate(msg, data) {
    db.disableTemplate(msg.guild.id, data, (rowAffected) => {
        if (rowAffected) {
            msg.channel.send(`${data} has been removed from your templates.`);
        } else {
            msg.channel.send(`You dont have a template called ${data}`);
        }
    })
}

function addTemplate(msg, data) {
    if (msg.attachments.size !== 1) {
        msg.reply('You need to attach an image along with the message. !ezm add template-name');
        return;
    }
    let image = msg.attachments.first();
    console.log(image);

    if (image.size == null || (image.size /1000) > 5000 ) {
        msg.reply('Filesize too large, please reduce the size of the image and try again.')
        return;
    }

    //Remove spaces from the name they've given this template
    let templateName = data.join('-');

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
    db.listTemplates(msg.guild.id, (templates) => {
        message += templates.map(name => name + '\n');
        msg.channel.send(message);
    })
}

function memeMaker(msg, imageTemplate, text) {
    //Retrieve the template from the database
    //passes the db result into a callback
    db.retrieveTemplate(imageTemplate, msg.guild.id, (template) => {
        //Check if the template exists
        if (!template) {
            msg.reply(`I can't find a template called ${imageTemplate}`);
        } else {

            //Attempt to retrieve an object from S3 with the db's returned key name
            //Callback passes the response into the meme maker
            let s3 = new AWS.S3();
            let imageBuffer = undefined;
            s3.getObject({
                Bucket: 'ezmeme-templates',
                Key: template
            }, function(err, data) {

                //if no object returned, throw error
                if (err) {throw err}

                //Setup meme maker config
                imageBuffer = data.Body;
                let textSettings = {
                    font: Jimp.FONT_SANS_64_WHITE,
                    text: text,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_TOP,
                    placementX: 20,
                    placementY: 40,
                };
            
                let imageSettings = {
                    input: imageBuffer,
                    output: 'new.jpg',
                    quality: 100
                }
            
                //Generate the meme, and pass it into a callback that returns the image
                AddTextToImage(textSettings, imageSettings, (img) => {
                    msg.channel.send( {
                        files: [
                            img
                        ]
                    })
                })
            })
        

        }
    

    });


}


function AddTextToImage(textSettings, imageSettings, callback) {
    Jimp.read(imageSettings.input)
    .then(img => (
        Jimp.loadFont(textSettings.font).then(font => ([img, font]))
    ))
    .then(data => {
        tpl = data[0];
        font = data[1];

        let maxWidth = tpl.bitmap.width - 40;
        let maxHeight = tpl.bitmap.height - 40;

        return tpl.print(font,textSettings.placementX, textSettings.placementY, {
            text: textSettings.text,
            alignmentX: textSettings.alignmentX,
            alignmentY: textSettings.alignmentY
        }, maxWidth, maxHeight);

    })
    .then(tpl => (tpl.getBufferAsync(Jimp.MIME_JPEG)))
    .then(imageBuffer => { 
        console.log('Image generated');
        callback(imageBuffer);
      })
    .catch(err => {
        console.error(err);
    })
}