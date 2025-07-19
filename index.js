require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const jwtSecret = process.env.JWT_ACCESS_TOKEN;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster3.6yot5jq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster3`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// middle wars
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true, // Required for cookies
  })
);
app.use(express.json());
app.use(cookieParser());

// user verify jwt
const verifyJWT = (req, res, next) => {
  const token = req.cookies.cookieToken;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized " });
  }
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized " });
    }
    req.decoded = decoded;
  });
  // req.user = decoded;
  next();
};
// for admin verify jwt
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden – Admins only" });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const database = client.db("pet-adoption");
    // database collections
    const petsCollection = database.collection("pets");
    const usersCollection = database.collection("users");
    const donationCampaigns = database.collection("donationCampaigns");
    const donations = database.collection("donations");
    const adoptRequestPetsCollection =
      database.collection("adopt-request-pets");

    // crete a token

    app.post("/jwt", async (req, res) => {
      const { email } = req.body;
      // console.log(req.body);
      if (!email) {
        return res.status(400).send("Email is required");
      }
      const token = jwt.sign({ email }, jwtSecret, { expiresIn: "5h" });
      res.cookie("cookieToken", token, {
        httpOnly: true,
        secure: false,
      });

      res.send({ success: true });
    });

    // get my added pet api   ✅jwt
    app.get("/pets/:email", verifyJWT, async (req, res) => {
      const { email } = req.params;
      if (req.decoded.email !== email) {
        return res.status(403).json({ message: "Unauthorized " });
      }
      try {
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
        res.status(500).json({ error: "Internal server error." });
      }
    });

    // get pet which are unadopted
    app.get("/available-pets", async (req, res) => {
      const pets = await petsCollection
        .find({ adopted: false })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(pets);
    });

    // get user role by email  ✅verfijwt
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!req.decoded) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!email) {
        return res
          .status(400)
          .json({ error: "Email query parameter is required." });
      }
      if (email !== req.decoded.email) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ role: "guest" });
      res.send({ role: user.role }); // 'user' or 'admin'
    });

    // get all user       ✅ here have to implement if Admin then he can acces api data
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection
          .find()
          .sort({
            role: -1, // This will put "admin" before "user" alphabetically (descending)
            name: 1, // Then sort by name ascending as secondary sort
          })
          .toArray();

        if (!users || users.length === 0) {
          return res.status(404).send({ error: "No users found" });
        }

        res.send(users);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    // ✅ GET: Load My Donation Campaigns  ✅verfijwt
    app.get("/donation-campaigns/:email", verifyJWT, async (req, res) => {
      try {
        const { email } = req.params;
        if (!req.decoded) {
          return res.status(403).json({ message: "Forbidden" });
        }
        if (!email) {
          return res
            .status(400)
            .json({ error: "Email query parameter is required." });
        }

        if (email !== req.decoded.email) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const campaigns = await donationCampaigns
          .find({ owner: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.json(campaigns);
      } catch (error) {
        console.error("Error fetching donation campaigns:", error);
        res.status(500).json({ error: "Internal server error." });
      }
    });

    // get single pet via petId
    app.get("/pet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    // /get adopt request using email  ✅verfijwt
    app.get("/adoption-requests/:ownerEmail", verifyJWT, async (req, res) => {
      try {
        const { ownerEmail } = req.params;

        // Check if decoded exists (added safety)
        if (!req.decoded) {
          return res.status(403).json({ message: "Forbidden" });
        }
        if (!ownerEmail) {
          return res
            .status(400)
            .json({ error: "Email query parameter is required." });
        }

        if (ownerEmail !== req.decoded.email) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const result = await adoptRequestPetsCollection
          .find({ owner: ownerEmail })
          .toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests" });
      }
    });

    // GET /donation-campaigns/:id
    // app.get("/donation-campaigns/:id", async (req, res) => {
    //   try {
    //     const { id } = req.params;

    //     const campaign = await donationCampaigns.findOne({
    //       _id: new ObjectId(id),
    //     });

    //     if (!campaign) {
    //       return res
    //         .status(404)
    //         .json({ success: false, error: "Campaign not found" });
    //     }

    //     res.json({ success: true, data: campaign });
    //   } catch (error) {
    //     res.status(500).json({ success: false, error: "Server error" });
    //   }
    // });

    // ✅ Get campaign by ID
    app.get("/editdonation-campaign/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid campaign ID format",
          });
        }

        const result = await donationCampaigns.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Campaign not found",
          });
        }

        res.json(result); // direct data
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    // get all donation campaign
    app.get("/donation-campaigns", async (req, res) => {
      try {
        // Extract query parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const sort = req.query.sort || "createdAt";
        const order = req.query.order || "desc";

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        // Get total count for hasMore calculation
        const totalCount = await donationCampaigns.countDocuments();
        // Fetch campaigns with pagination and sorting
        const campaigns = await donationCampaigns
          .find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        // Calculate if there are more pages
        const hasMore = skip + campaigns.length < totalCount;

        // Send response
        res.json({
          success: true,
          campaigns,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasMore,
            limit,
          },
        });
      } catch (error) {
        console.error("Error fetching donation campaigns:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch donation campaigns",
          error: error.message,
        });
      }
    });

    // get donation campaign by id
    app.get("/donation-campaign-details/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid campaign ID format",
          });
        }

        // Find campaign by ID
        const campaign = await donationCampaigns.findOne({
          _id: new ObjectId(id),
        });

        if (!campaign) {
          return res.status(404).json({
            success: false,
            message: "Donation campaign not found",
          });
        }

        // Return campaign details
        res.status(200).json({
          success: true,
          data: campaign,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // get donation transation via email ✅verfijwt
    app.get(
      "/donation-transations-details/:email",
      verifyJWT,
      async (req, res) => {
        try {
          // Check if decoded exists (added safety)
          if (!req.decoded) {
            return res.status(403).json({ message: "Forbidden" });
          }
          const { email } = req.params;
          if (!email) {
            return res
              .status(400)
              .json({ error: "Email query parameter is required." });
          }

          if (email !== req.decoded.email) {
            return res.status(403).json({ message: "Forbidden" });
          }

          const transactionDetails = await donations
            .find({ donatedBy: email }) // your stored user email field
            .sort({ createdAt: -1 }) // newest pets first
            .toArray();

          res.json(transactionDetails);
        } catch (error) {
          console.error("Error fetching pets:", error);
          res.status(500).json({ error: "Internal server error." });
        }
      }
    );

    // stripe payment method intent
    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // Convert to cents
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // save payment details to database
    app.post("/donations", async (req, res) => {
      try {
        const donation = req.body;
        // Add extra fields if needed
        donation.createdAt = new Date();

        const result = await donations.insertOne(donation);

        res.status(201).json({
          success: true,
          message: "Donation saved",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.log("Error saving donation:", err);
        res.status(500).json({ success: false, message: "Server Error" });
      }
    });

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

    // request for adotion api
    app.post("/adoption-request", async (req, res) => {
      const petDetails = req.body;
      const result = await adoptRequestPetsCollection.insertOne(petDetails);
      res.send(result);
    });
    // ✅ POST: Create Donation Campaign
    app.post("/donation-campaigns", async (req, res) => {
      console.log(req.body);
      try {
        const {
          petName,
          image,
          owner,
          maxDonation,
          lastDate,
          shortDescription,
          longDescription,
          ownerName,
          createdAt,
        } = req.body;

        if (
          !petName ||
          !image ||
          !owner ||
          !maxDonation ||
          !lastDate ||
          !shortDescription ||
          !longDescription ||
          !ownerName ||
          !createdAt
        ) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const donationData = {
          petName,
          image,
          owner,
          maxDonation: parseFloat(maxDonation),
          lastDate,
          shortDescription,
          longDescription,
          createdAt,
          ownerName,
          donatedAmount: 0,
          isPaused: false,
        };

        const result = await donationCampaigns.insertOne(donationData);
        res.status(201).json({
          message: "Donation campaign created successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error("Error saving campaign:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Update pet by ID
    app.put("/pets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const data = req.body;

        const updatedDoc = {
          $set: {
            ...data,
            updatedAt: new Date().toISOString(),
          },
        };

        const options = { upsert: true };
        const result = await petsCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.log("Error updating pet:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.put("/donation-campaigns/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const data = req.body;

        const updatedDoc = {
          $set: {
            petName: data.petName,
            owner: data.owner,
            image: data.image,
            maxDonation: parseFloat(data.maxDonation),
            lastDate: data.lastDate,
            shortDescription: data.shortDescription,
            longDescription: data.longDescription,
            updatedAt: new Date().toISOString(),
          },
        };

        const options = { upsert: true };
        const result = await donationCampaigns.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.log("Error updating donation campaign:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // mark pet as adopt api
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

    // make user admin
    app.patch("/users/make-admin/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        // Validate userId
        if (!userId) {
          return res.status(400).send({
            success: false,
            message: "User ID is required",
          });
        }

        // Check if user exists
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });
        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // Check if user is already an admin
        if (user.role === "admin") {
          return res.status(400).send({
            success: false,
            message: "User is already an admin",
          });
        }

        // Update user role to admin
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              role: "admin",
              updatedAt: new Date(),
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(500).send({
            success: false,
            message: "Failed to update user role",
          });
        }

        // Get updated user data
        const updatedUser = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });

        res.status(200).send({
          success: true,
          message: "User promoted to admin successfully",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error making user admin:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });
    // PATCH /donation-campaigns/:id/toggle-pause
    app.patch("/donation-campaigns/:id/toggle-pause", async (req, res) => {
      try {
        const { id } = req.params;
        const campaign = await donationCampaigns.findOne({
          _id: new ObjectId(id),
        });

        if (!campaign) {
          return res
            .status(404)
            .json({ success: false, error: "Campaign not found" });
        }

        await donationCampaigns.updateOne(
          { _id: new ObjectId(id) },
          { $set: { isPaused: !campaign.isPaused } }
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: "Server error" });
      }
    });

    // delele my donation campaign
    app.delete("/delete-donation-campaign/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await donationCampaigns.deleteOne({
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

    // delele my pet
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

    // TODO----------------------------------------------------------=>
    // update dontion-amount when a user paying
    app.put("/update-donation-amount", async (req, res) => {
      try {
        const { campaignId, amount } = req.body;

        const result = await Campaign.findByIdAndUpdate(
          campaignId,
          {
            $inc: { donatedAmount: amount },
          },
          { new: true }
        );

        res.send({
          success: true,
          message: "Donation amount updated!",
          updatedCampaign: result,
        });
      } catch (err) {
        console.error("Error updating donation amount:", err);
        res.status(500).json({
          success: false,
          message: "Failed to update donation amount.",
        });
      }
    });

    // accept adopt request api
    app.put("/adoption-requests/:id/accept", async (req, res) => {
      try {
        const { id } = req.params;
        const data = req.body;
        const filter = { _id: new ObjectId(id) };
        const result = await adoptRequestPetsCollection.findOne(filter);

        const query = { _id: new ObjectId(result.petId) };
        const options = { upsert: true };
        const updatedStatus = {
          $set: {
            status: "unavailable",
            adopted: true,
          },
        };
        const petsresult = await petsCollection.updateOne(
          query,
          updatedStatus,
          options
        );
        const updatedDoc = {
          $set: {
            status: data.status,
          },
        };

        const response = await adoptRequestPetsCollection.updateOne(
          filter,
          updatedDoc,
          options
        );

        res.send(result);
      } catch (error) {
        console.log("Error updating donation campaign:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }

      // console.log(response);

      //  const options = { upsert: true };
      //  const finalresult = await donationCampaigns.updateOne(
      //    filter,
      //    updatedDoc,
      //    options
      // );
      // console.log(finalresult);

      // const data = req.body;
      // console.log("api hitted ", id);
      // console.log(data);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet server Running");
});

app.listen(port, () => {
  console.log(`Pet server running on port ${port}`);
});
