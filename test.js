const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//middle ware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

//my created middle wares
const logger = async (req, res, next) => {
  console.log("called:", req.host, "--", req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in middleware:--", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
  // next(); don't call next function here
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekax5iq.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    //jwt
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      //   res.cookie('token', token, {
      //     httpOnly: true,
      //     secure: process.env.NODE_ENV === 'production',
      //     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      // })
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: 'none'
        })
        .send({ success: true });
    });

    // user collection
    const usersCollection = client.db("usersDB").collection("users");
    app.get("/users", logger, async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });
    app.post("/users", logger, async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        // const token = jwt.sign(user, "secret", { expiresIn: "1h" });
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });

    // services
    const servicesCollection = client.db("carDoctorsDB").collection("services");
    app.get("/services", logger, async (req, res) => {
      try {
        console.log(req.query); //this will return an object and the object will have those key and values which are sended when requested for get or read datas.
        //"This will return an object with the keys and values that were sent when requested to get or read data."
        let query = {};
        if (req.query?.price) {
          query = { price: req.query?.price };
        } else if (req.query?.title) {
          query = { title: req.query.title };
        }
        const result = await servicesCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });
    app.get("/services/:id", logger, async (req, res) => {
      const id = req.params.id;
      //   console.log(req.query);
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    //Bookings
    const bookingsCollection = client.db("bookingsDB").collection("bookings");
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log("query email:--", req.query?.email);
      console.log("user in the valid token:--", req.user);
      if (req.query?.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query?.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    });
    app.post("/bookings", async (req, res) => {
      const data = req.body;
      const result = await bookingsCollection.insertOne(data);
      res.send(result);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car Doctors server is running...");
});

app.listen(port, () => {
  console.log(`Car Doctors server is running on port ${port}`);
});

// DB_USER=carDoctors
// DB_PASS=xrg6PT6enN19ux6q
// ACCESS_TOKEN_SECRET=f0478c76014f2c80ccd8868ea85d74d155c10bce8bd98ae64b69597023638526aa14906b176bc1fd85bc541de3f0fa358eb3c2b7129de3dec036ee4aaa2d2dd2
