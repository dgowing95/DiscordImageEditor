var Meme = require('./controllers/Meme.js');


async function main() {
    let c = new Meme()
    try {
        await c.loadImage('https://icatcare.org/app/uploads/2018/07/Thinking-of-getting-a-cat.png')
    } catch (err) {
        console.log(err);
        return ('Couldnt load meme');
    }

    try {
        await c.writeText('Comic Sans', 'Some example text which could be a meme');
    } catch (err) {
        console.log(err);
        return ("Couldn't write text");
    }
    await c.exportToFile();
    return ("Created Meme");
}

main()
.then (msg => console.log(msg));