
const Canvas = require('canvas');
const fs = require('fs');

class Meme {
    canvas;
    context;
    width;
    height;

    constructor() {

    }

    async registerFonts() {
        fs.readdir('./fonts/', (err, files) => {
            if (err) {
                console.log(err);
                return;
            }
            files.forEach(font => {
                Canvas.registerFont(`./fonts/${font}`, { family: 'Comic Sans' });
            });
        })
    }

    async loadImage(imageURL) {
        await this.registerFonts();
        return new Promise(function(resolve, reject) {

            Canvas.loadImage(imageURL)
            .then( function(image) {
                this.canvas = Canvas.createCanvas(image.width, image.height);
                this.width = image.width;
                this.height = image.height
                this.context = this.canvas.getContext('2d');
                this.context.drawImage(image,0,0);
                resolve();
            }.bind(this))

            .catch( (error) => {
                reject(error);
            })

        }.bind(this))
    }

    async writeText(font, text) {
        this.context.font = `64px ${font}`;
        this.context.fillText(text, this.width/2.5, 100);
    }

    exportToFile() {
        if (!this.canvas) {
            return;
        }
        var fs = require('fs')
        , out = fs.createWriteStream(__dirname + '/text.png')
        , stream = this.canvas.pngStream();

        stream.on('data', function(chunk){
        out.write(chunk);
        });

        stream.on('end', function(){
        console.log('saved png');
        });

        stream.on('error', function(error) {
            console.log(error);
        })
    }
}
module.exports = Meme