require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// middle wars
app.use(cors());
app.use(express.json());
app.use(cookieParser());

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
    const donationCampaigns = database.collection("donationCampaigns");
    const donations = database.collection("donations");
    const adoptRequestPetsCollection =
      database.collection("adopt-request-pets");

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

    // /get adopt request using email
    app.get("/adoption-requests/:ownerEmail", async (req, res) => {
      try {
        const { ownerEmail } = req.params;
        const result = await adoptRequestPetsCollection
          .find({ owner: ownerEmail })
          .toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests" });
      }
    });

    // get my added pet api
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

    // Update pet by ID
    app.put("/pets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id);
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
          createdAt,
        } = req.body;

        if (
          !image ||
          !maxDonation ||
          !lastDate ||
          !shortDescription ||
          !longDescription
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

    // ✅ GET: Load My Donation Campaigns
    app.get("/donation-campaigns/:email", async (req, res) => {
      try {
        const { email } = req.params;

        if (!email) {
          return res
            .status(400)
            .json({ error: "Email parameter is required." });
        }

        const campaigns = await donationCampaigns
          .find({ owner: email })
          .sort({ createdAt: -1 }) // newest campaigns first
          .toArray();

        res.json(campaigns);
      } catch (error) {
        console.error("Error fetching donation campaigns:", error);
        res.status(500).json({ error: "Internal server error." });
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

    // TODO
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
