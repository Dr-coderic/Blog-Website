// practicing postman a little
// import express from 'express';

// const app = express();
// //in order to body property work properly in express, we have to add this 
// //MIDDLEWARE
// app.use(express.json()); // for parsing application/json
// // parse requests of content-type - application

// app.post('/hello', (req, res) => {
//     console.log(req.body);
//     res.send(`Hello ${req.body.name}!`);
// });

// app.get('/hello/:name', (req,res) => {
//     const {name} = req.params;
//     res.send(`Hello ${name} !!`);
// });

// app.listen(8000, () => {
//     console.log('Server is listening on port 8000');
// });

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import express from  "express";
import 'dotenv/config';
// import {MongoClient} from 'mongodb';
import {db, connectToDb} from './db.js';


import { fileURLToPath } from 'url';
// console.log('import.meta.url :>> ', import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//creating a demi database - no need after creating a mongoDB database;
// let articlesInfo =[{
//     name: 'learn-react',
//     upvotes: 0,
//     comments :[],
// } , {
//     name: 'learn-node',
//     upvotes: 0,
//     comments :[],
    
// } , {
//     name: 'mongodb',
//     upvotes: 0,
//     comments :[],
// }]


const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);

admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

//static files
const app =express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

app.get(/^(?!\/api).+/, (req,res) =>{
    res.sendFile(path.join(__dirname,  '../build/index.html'));
})

//middleware for authenticate and route protection
app.use(async (req, res, next) => {
    const {authtoken} = req.headers;
    // console.log(74, 'authtoken :>> ', authtoken);

    if (authtoken){
        try{
            req.user = await admin.auth().verifyIdToken(authtoken);
            // console.log(79,'req.user :>> ', req.user);
        }
        catch (e){
            console.log(80,'e :>> ', e);
            // return res.statusCode(400);
        }    
    }
    req.user = req.user || {};

    next();
});

//creating articles endpoint
app.get('/api/articles/:name', async (req,res)=>{
    const {name} = req.params;
    const {uid} = req.user;
    console.log('req.user :>> ', req.user);
    console.log('name :>> ', name);
    console.log('uid :>> ', uid);

    // const client = new   MongoClient('mongodb://127.0.0.1:27017');
    // await client.connect();

    // const db= client.db('react-blog-db'); //similar to use react-blog-db as the selected DB in cmd
    const article = await db.collection('articles').findOne({name});
    // const article = await db.collection('articles').findOne({});

    console.log('article :>> ', article);

    if(article){
        const upvotedIds = article.upvotedIds ||  [];
        article.canUpvote = uid && !upvotedIds.includes(uid);

        res.json(article);
    }else{
        res.sendStatus(404);
        // res.status(200).json({message:"got into else"})
    }
});

//middleware - route protection
app.use ((req,res,next)=>{
    if(req.user){
        next();
    } else {
        res.sendStatus(401).send('You must be logged in to view this resource');
    }
})

//creating upvote endpoints 
app.put('/api/articles/:name/upvote',async (req, res)=>{
    const {name} = req.params;
    const {uid}=req.user;

    const article=await db.collection('articles').findOne({name});

    if(article){
        const upvotedIds = article.upvotedIds ||  [];
        const canUpvote = uid && !upvotedIds.includes(uid);
        if(canUpvote) {
            await  db.collection('articles').updateOne(
                {name},
               {$inc:{upvotes:1},
                $push: {upvotedIds : uid}
                }
              );
        }

            // const article = articlesInfo.find((a)=> a.name === name ); // just to access the dumi data, so replace it with actual mongodb query

            // const client = new MongoClient('mongodb://127.0.0.1:27017');
            // await client.connect();

            // const db = client.db('react-blog-db');

        const updatedArticle = await db.collection( 'articles').findOne( {name} );

        if(article){
            res.json(updatedArticle);
        }
        
        // article.upvotes += 1;
        // res.send(`The ${name} article now has ${article.upvotes} upvotes!!`); // no need of this now, since we r using axios
        // //we need to  send back the updated data
        return res.status(404).send("Article not found");

    }
});

//creating comments endpoint
app.post('/api/articles/:name/comments', async (req,res)=>{
    const {name} = req.params;
    const { text} =req.body;
    const {email} = req.user;

    // const article= articlesInfo.find(x => x.name===name) ; // again instead of this , using mongodb query
    // const client = new MongoClient('mongodb://127.0.0.1:27017');
    // await client.connect();

    // const db = client.db('react-blog-db');
    await  db.collection('articles').updateOne({ name },
        {$push : {comments : {postedBy: email,text}}, 
    });
    const article =  await db.collection('articles').findOne({name});
    
    
    if (article ) {
        // article.comments.push(newComment);
        // res.status(200).send(article.comments); // no need for this now
        res.json(article);
    }else{
        res.send('No Article Found, Will be available soon...');
        // const newComment={postedBy,text};  //no need now
    }
});

const PORT = process.env.PORT || 8000;

connectToDb(() => {
    console.log("Successfully Connected to database...");
    app.listen(PORT,() =>{
        console.log("Server is listeing at port ",PORT);
});
});