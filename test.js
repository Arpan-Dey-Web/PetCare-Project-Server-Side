// const express = require("express");
// const cors = require("cors");
// const app = express();
// const port = process.env.PORT || 3000;
// const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");

// require("dotenv").config();
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "https://innerself.netlify.app/"],
//     credentials: true,
//   })
// );
// app.use(cookieParser());
// app.use(express.json());
// const logger = (req, res, next) => {
//   console.log("inside the logger middlewars");
//   next();
// };

// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bndepdm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     // await client.connect();
//     const database = client.db("groupdb");
//     const groupCollection = database.collection("groups");

//     // group posted in mongodb server
//     app.post("/creategroups", async (req, res) => {
//       const newGroup = req.body;
//       const result = await groupCollection.insertOne(newGroup);
//       res.send(result);
//     });

//     app.get("/creategroups", async (req, res) => {
//       const allDate = await groupCollection
//         .find()
//         .sort({ lastDate: 1 })
//         .limit(6)
//             .toArray();
        
//       res.send(allDate);
//     });

//     app.get("/creategroups/all-data", async (req, res) => {
//       const cursor = groupCollection.find();
//       const result = await cursor.toArray();
//       res.send(result);
//     });

//     app.get("/creategroups/:id", async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };
//       const result = await groupCollection.findOne(query);
//       console.log(result);
//       res.send(result);
//     });

//     app.delete("/deleteGroup:id", async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };

//       const result = await groupCollection.deleteOne(query);
//       res.send(result);
//     });

//     app.get("/my-groups/:email", async (req, res) => {
//       const email = req.params.email;
//       const result = await groupCollection.find({ email }).toArray();
//       res.send(result);
//     });

//     app.put("/groups/:id", async (req, res) => {
//       const id = req.params.id;
//       const filter = { _id: new ObjectId(id) };
//       const updatedGroup = req.body;
//       const updatedDoc = {
//         $set: updatedGroup,
//       };
//       const options = { upsert: true };
//       const result = await groupCollection.updateOne(
//         filter,
//         updatedDoc,
//         options
//       );
//       res.send(result);
//     });

//     // await client.db("admin").command({ ping: 1 });
//     // console.log(
//     //   "Pinged your deployment. You successfully connected to MongoDB!"
//     // );
//   } finally {
//     // await client.close();
//   }
// }
// run().catch(console.dir);

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

// app.listen(port, () => {
//   // console.log(` app listening on port ${port}`);
// });
