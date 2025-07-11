require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

// middle wars
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// arponthelearner
// SGrRatHiR6OLr9hX

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster3.6yot5jq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster3`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("pet-adoption");

    // database collections
    const petsCollection = database.collection("pets");
    const usersCollection = database.collection("users");

    // user details saved in database

    app.post("/register", async (req, res) => {
      const { name, email, image, role } = req.body;
      const result = await usersCollection.insertOne({
        name,
        email,
        image,
        role,
      });
      res.send(result);
    });

    //pet add in database
    app.post("/pet", async (req, res) => {
      const petDetails = req.body;
      const result = await petsCollection.insertOne(petDetails);
      res.send(result);
    });
    // get pet which are unadopted
    app.get("/available-pets", async (req, res) => {
      const pets = await petsCollection
        .find({ adopted: false })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(pets);
    });

    

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet server Running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
