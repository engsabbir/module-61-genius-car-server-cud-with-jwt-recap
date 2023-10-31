const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://car-doctor-b17b2.web.app',
        'https://car-doctor-b17b2.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


// my custom middleware
const logger = (req, res, next) => {
    // console.log('log info:', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" })
        }
        req.user = decoded;
        next();
    })
}


// const uri = "mongodb+srv://<username>:<password>@cluster0.khubzpr.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.khubzpr.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const serviceCollection = client.db('carDoctor').collection('carServices');
        const bookingCollection = client.db('carDoctor').collection('bookings');

        // auth related api 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log("user", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
            })
            res.send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logged out user', user)
            res.clearCookie('token', { maxAge: 0 })
            res.send({ logOutSuccess: true })
        })


        //service related api
        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', logger, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })

        //bookings related api
        app.get('/bookings', logger, verifyToken, async (req, res) => {
            // console.log('query data',req.query)
            // console.log('cookies data', req.cookies)
            // console.log('token owner data', req.user)
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: "forbidden" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body;
            console.log('added response', updatedBooking)
            const updatedData = {
                $set: {
                    status: updatedBooking.status
                }
            };
            const result = await bookingCollection.updateOne(filter, updatedData);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Car doctor is running!!')
})

app.listen(port, () => {
    console.log(`Car doctor port is running on PORT: ${port}`)
})