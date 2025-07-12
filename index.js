require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const adoptRequestPetsCollection =
      database.collection("adopt-request-pets");

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

    // get single pet via petId
    app.get("/pet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    // request for adotion api
    app.post("/adoption-request", async (req, res) => {
      const petDetails = req.body;
      const result = await adoptRequestPetsCollection.insertOne(petDetails);
      res.send(result);
    });
    // get my added pet api
    // GET /pets?email=user@example.com

    app.get("/pets/:email", async (req, res) => {
      try {
        const { email } = req.params;
        // console.log(email);

        if (!email) {
          return res
            .status(400)
            .json({ error: "Email query parameter is required." });
        }

        const pets = await petsCollection
          .find({ owner: email }) // your stored user email field
          .sort({ createdAt: -1 }) // newest pets first
          .toArray();

        res.json(pets);
      } catch (error) {
        console.error("Error fetching pets:", error);
        res.status(500).json({ error: "Internal server error." });
      }
    });

    // mark pet as adopt api
    // PATCH /pets/adopt/:id
    app.patch("/pets/adopt/:id", async (req, res) => {
      const petId = req.params.id;

      try {
        const result = await petsCollection.updateOne(
          { _id: new ObjectId(petId) },
          { $set: { adopted: true } }
        );

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Pet marked as adopted" });
        } else {
          res.status(404).send({
            success: false,
            message: "Pet not found or already adopted",
          });
        }
      } catch (error) {
        console.error("Error marking pet as adopted:", error.message);
        res
          .status(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    });

    // delele my pet 
    // DELETE /pets/:id
    app.delete("/pets/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await petsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Pet deleted successfully" });
        } else {
          res.status(404).json({ message: "Pet not found" });
        }
      } catch (error) {
        console.error("Error deleting pet:", error);
        res.status(500).json({ message: "Server error" });
      }
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
