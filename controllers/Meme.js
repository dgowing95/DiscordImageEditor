
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
                this.context.fillStyle = '#FFFFFF';
                this.context.textAlign = 'center';
                resolve();
            }.bind(this))

            .catch( (error) => {
                reject(error);
            })

        }.bind(this))
    }

    getFontSize(font, text) {
        let fontSize = 100;

        do {
            this.context.font = `${fontSize -= 10}px "${font}"`;
        } while (this.context.measureText(text).width > this.width - 300);

        return this.context.font;
    }

    async writeText(font, upperText, lowerText = '') {
        this.context.font = this.getFontSize(font,upperText);
        this.context.fillText(upperText, this.width/2, this.height*0.15);

        if (lowerText.length > 0) {
            this.context.font = this.getFontSize(font,lowerText);
            this.context.fillText(lowerText, this.width/2, this.height *0.95);
        }
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