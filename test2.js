const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const {
  MongoClient,
  ServerApiVersion,
  Collection,
  ObjectId,
} = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middle wares
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
  console.log("called:-", req.host, "--", req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    // console.log(decoded);
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("car doctors server is running...");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekax5iq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collections
const usersCollection = client.db("usersDB").collection("users");
const servicesCollection = client.db("carDoctorsDB").collection("services");
const bookingsCollection = client.db("bookingsDB").collection("bookings");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: "None",
        })
        .send({ success: true });
    });

    //POST :: insert an user
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        //  return res.send({ error: true, message: err.message });
        return res.send({ error: true, message: err.message });
      }
    });
    // Get :: services
    app.get("/services", async (req, res) => {
      try {
        let query = {};
        if (req.query?.price) {
          query = { price: req.query?.price };
        }
        const result = await servicesCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // Get :: single service with id
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: { title: 1, img: 1, price: 1, service_id: 1 },
        };
        const result = await servicesCollection.findOne(query, options);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });

    // Get :: bookings
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        // console.log(req.user);
        let query = {};
        if (req.query?.email) {
          query = { email: req.query?.email };
        }
        if (req.query?.email !== req.user.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // POST :: bookings
    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // DELETE :: single booking with id
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
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

app.listen(port, () => {
  console.log(`car doctors server is running from port ${port}`);
});
