var express = require("express");
var app = express();
var PORT = process.env.PORT || 3000; // bardzo istotna linijka - port zostaje przydzielony przez herkou
var path = require( "path" );
var hbs = require( 'express-handlebars' );
var bodyParser = require( 'body-parser' );
var formidable = require( "formidable" );
const cookieParser = require("cookie-parser");
const expressSession = require( "express-session" );


app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( cookieParser() );

app.use(expressSession({
    secret: 'davaimochii',
    saveUninitialized:true,
    cookie: { maxAge: 1000 * 60 * 10 }, // maxAge = 10 minut
    resave: false 
  }));


app.set( 'views', path.join( __dirname, 'views' ) );
app.engine('hbs', hbs({
    defaultLayout: "main.hbs",
    extname: '.hbs',
    partialsDir: "views/partials",
    helpers: {         
        toUpper( text )
        {
            return text.toUpperCase();
        },
        getImage( fileName )
        {
            let start = fileName.lastIndexOf(".");
            if( start == -1 )
                return null;
            let ext = fileName.substr( start + 1 );
            return "fiv-icon-" + ext;
        },
        trimName( fileName )
        {
            if( !(fileName.length > 26) )
                return fileName;
            let first = fileName.substr( 0, 21 );
            let second = fileName.substr( fileName.lastIndexOf( '.' )-2 );
            return first + "..." + second;
        }
    }
}));
app.set( 'view engine', 'hbs' );


const context = {
    nav:
        [
            { title: "upload" },
            { title: "filemanager" },
            { title: "info" }
        ]
}

var fileList = [];
var session;
const credentials = { login: 'SpecPL', pass: 'NoToJestHaslo' };

app.get("/", function (req, res) { 
    session = req.session;
    if( !session.user )
    {
        res.redirect( 302, "../login" );
        return;
    }

    res.render( "upload.hbs", context );
} );
app.get("/upload", function (req, res) { 
    session = req.session;
    if( !session.user )
    {
        res.redirect( 302, "../login" );
        return;
    }

    res.render( "upload.hbs", context );
} );

app.post("/upload", function (req, res) { 

    let form = formidable({});

    form.uploadDir = __dirname + '/static/upload/';       // folder do zapisu zdjęcia
    form.keepExtensions = true;
    form.multiples = true;

    form.parse(req, function (err, fields, files) {

        console.log("----- przesłane formularzem pliki ------");

        let imagetoupload = files.files;

        if( imagetoupload.length )
            console.log( "Ile plikow: " + imagetoupload.length );
        else
            addFile( imagetoupload )
        // console.log( JSON.stringify(imagetoupload, null,5) );


        for( let i = 0; i < imagetoupload.length; i++ )
        {
            addFile( imagetoupload[i] );
        }
        console.table( fileList );

        // res.setHeader( "Content-Type", "application/json" );
        // res.send(JSON.stringify(imagetoupload, null,5));
        res.redirect( 302, "../" );
    });
} );

app.get("/filemanager", function (req, res) { 
    session = req.session;
    if( !session.user )
    {
        res.redirect( 302, "../login" );
        return;
    }

    context.fileTable = [ "id", "obraz", "name", "size", "type", "-", "-", "-" ];
    context.files = fileList;
    res.render( "filemanager.hbs", context );
} );

app.post("/delete", function (req, res) { 
    if( req.body.delete )
    {
        let idToDel = req.body.delete;
        removeFile( idToDel );
    }

    res.redirect( 302, "../filemanager" )
} );

app.get("/info", function (req, res) { 
    session = req.session;
    if( !session.user )
    {
        res.redirect( 302, "../login" );
        return;
    }

    context.info = { info: "Nie wybrano pliku" };

    res.render( "info.hbs", context );
    delete context.info;
} );
app.post("/info", function (req, res) { 
    if( req.body.info )
    {
        context.info = getFileOfId( req.body.info );
    }

    res.render( "info.hbs", context );
    delete context.info;
} );

app.post("/download", function (req, res) { 
    if( req.body.download )
    {
        res.download( req.body.download );
    }
} );

app.post("/reset", function (req, res) { 
    if( req.body.reset )
    {
        fileList.length = 0;
        res.redirect( 302, "../filemanager" );
    }
} );


app.get("/login", function (req, res) { 
    if( !session || !session.user )
        session = req.session;
    if( session.user )
    {
        res.redirect( 302, "../upload" );
        return;
    }
    else
    {
        res.render( "login.hbs" );
    }
} );

app.post("/login", function (req, res) { 
    if( req.body.login && req.body.password )
    {
        if( req.body.login === credentials.login && req.body.password === credentials.pass )
        {
            session = req.session;
            session.user = req.body.login;
            console.log( req.session );
            res.redirect( 302, "../upload" );
            return;
        }
        else
        {
            console.log( req.body.login, req.body.password );
            res.render( "login.hbs" );
        }
    }
} );

app.get("/logout", function (req, res) { 
    if( session && session.user )
    {
        req.session.destroy();
        session.destroy;
    }
    res.redirect( 302, "../login" ); 
} );


app.use( express.static( "static" ) );
app.listen(PORT, function () {
    console.log("Start serwera na porcie " + PORT );
});

function getFileInfo( f )
{
    // file = JSON.parse( f );

    let id;
    try
    {
        id = fileList[fileList.length-1].id + 1;
    }
    catch
    {
        id = fileList.length + 1;
    }

    file = {};
    file.id = id;
    file.name = f.name;
    file.path = f.path;
    file.size = f.size;
    file.type = f.type;
    file.savedate = Date.now();

    return file;
}

function addFile( f )
{
    let file = getFileInfo( f );
    fileList.push( file );
}

function removeFile( id )
{
    // TODO ?
    fileList = fileList.filter( (el)=>{
        if( el.id == id )
            return false;
        return true;
    } );
}

function getFileOfId( id )
{
    return fileList.find( el => el.id == id );
}
