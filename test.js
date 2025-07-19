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

// Enhanced middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Enhanced JWT verification middleware
const verifyJWT = (req, res, next) => {
  const token =
    req.cookies.cookieToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized - No token provided",
      success: false,
    });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: "Unauthorized - Invalid token",
        success: false,
      });
    }
    req.decoded = decoded;
    req.user = decoded; // Add user to request object
    next();
  });
};

// Enhanced admin verification middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const userEmail = req.decoded.email;
    const database = client.db("pet-adoption");
    const usersCollection = database.collection("users");

    const user = await usersCollection.findOne({ email: userEmail });

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden - Admin access required",
        success: false,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// Enhanced owner verification middleware
const verifyOwner = (req, res, next) => {
  const { email } = req.params;

  if (req.decoded.email !== email) {
    return res.status(403).json({
      message: "Forbidden - You can only access your own data",
      success: false,
    });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const database = client.db("pet-adoption");

    // Database collections
    const petsCollection = database.collection("pets");
    const usersCollection = database.collection("users");
    const donationCampaigns = database.collection("donationCampaigns");
    const donations = database.collection("donations");
    const adoptRequestPetsCollection =
      database.collection("adopt-request-pets");

    // Enhanced JWT token creation endpoint
    app.post("/jwt", async (req, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            message: "Email is required",
            success: false,
          });
        }

        // Verify user exists in database
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({
            message: "User not found",
            success: false,
          });
        }

        // Create JWT token with user info
        const tokenPayload = {
          email: user.email,
          userId: user._id,
          role: user.role,
          name: user.name,
        };

        const token = jwt.sign(tokenPayload, jwtSecret, {
          expiresIn: "24h",
          issuer: "pet-adoption-server",
        });

        // Set secure cookie
        res.cookie("cookieToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.json({
          success: true,
          message: "Token created successfully",
          user: {
            email: user.email,
            role: user.role,
            name: user.name,
          },
        });
      } catch (error) {
        console.error("JWT creation error:", error);
        res.status(500).json({
          message: "Internal server error",
          success: false,
        });
      }
    });

    // Token validation endpoint
    app.get("/verify-token", verifyJWT, async (req, res) => {
      try {
        const user = await usersCollection.findOne({
          email: req.decoded.email,
        });

        if (!user) {
          return res.status(404).json({
            message: "User not found",
            success: false,
          });
        }

        res.json({
          success: true,
          valid: true,
          user: {
            email: user.email,
            role: user.role,
            name: user.name,
            _id: user._id,
          },
        });
      } catch (error) {
        res.status(500).json({
          message: "Internal server error",
          success: false,
        });
      }
    });

    // Logout endpoint
    app.post("/logout", (req, res) => {
      res.clearCookie("cookieToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    });

    // Enhanced: Get my added pets with owner verification
    app.get("/pets/:email", verifyJWT, verifyOwner, async (req, res) => {
      try {
        const { email } = req.params;

        const pets = await petsCollection
          .find({ owner: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.json({
          success: true,
          pets,
          count: pets.length,
        });
      } catch (error) {
        console.error("Error fetching pets:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get available pets (no authentication needed)
    app.get("/available-pets", async (req, res) => {
      try {
        const pets = await petsCollection
          .find({ adopted: false })
          .sort({ createdAt: -1 })
          .toArray();

        res.json({
          success: true,
          pets,
          count: pets.length,
        });
      } catch (error) {
        console.error("Error fetching available pets:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get user role by email (enhanced with JWT)
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      try {
        const email = req.params.email;

        // Only allow users to check their own role or admins to check any role
        if (req.decoded.email !== email && req.decoded.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Forbidden - Cannot access other user's role",
          });
        }

        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
            role: "guest",
          });
        }

        res.json({
          success: true,
          role: user.role,
          email: user.email,
        });
      } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get all users (admin only)
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const users = await usersCollection
          .find({}, { projection: { password: 0 } }) // Exclude password if exists
          .sort({
            role: -1,
            name: 1,
          })
          .toArray();

        res.json({
          success: true,
          users,
          count: users.length,
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch users",
        });
      }
    });

    // Make user admin (admin only)
    app.patch(
      "/users/make-admin/:userId",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        try {
          const { userId } = req.params;

          if (!ObjectId.isValid(userId)) {
            return res.status(400).json({
              success: false,
              message: "Invalid user ID format",
            });
          }

          const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });

          if (!user) {
            return res.status(404).json({
              success: false,
              message: "User not found",
            });
          }

          if (user.role === "admin") {
            return res.status(400).json({
              success: false,
              message: "User is already an admin",
            });
          }

          const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                role: "admin",
                updatedAt: new Date(),
                updatedBy: req.decoded.email,
              },
            }
          );

          if (result.modifiedCount === 0) {
            return res.status(500).json({
              success: false,
              message: "Failed to update user role",
            });
          }

          const updatedUser = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });

          res.json({
            success: true,
            message: "User promoted to admin successfully",
            user: {
              _id: updatedUser._id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
            },
          });
        } catch (error) {
          console.error("Error making user admin:", error);
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
      }
    );

    // Enhanced user registration
    app.post("/register", async (req, res) => {
      try {
        const { name, email, image, role = "user" } = req.body;

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "User already exists with this email",
          });
        }

        const newUser = {
          name,
          email,
          image,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser);

        // Create JWT token for new user
        const tokenPayload = {
          email: newUser.email,
          userId: result.insertedId,
          role: newUser.role,
          name: newUser.name,
        };

        const token = jwt.sign(tokenPayload, jwtSecret, {
          expiresIn: "24h",
          issuer: "pet-adoption-server",
        });

        res.cookie("cookieToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
          success: true,
          message: "User registered successfully",
          user: {
            _id: result.insertedId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
        });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Add pet (authenticated users only)
    app.post("/pet", verifyJWT, async (req, res) => {
      try {
        const petDetails = {
          ...req.body,
          owner: req.decoded.email,
          createdAt: new Date(),
          adopted: false,
        };

        const result = await petsCollection.insertOne(petDetails);

        res.status(201).json({
          success: true,
          message: "Pet added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding pet:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get adoption requests (owner only)
    app.get(
      "/adoption-requests/:ownerEmail",
      verifyJWT,
      verifyOwner,
      async (req, res) => {
        try {
          const { ownerEmail } = req.params;

          const requests = await adoptRequestPetsCollection
            .find({ owner: ownerEmail })
            .sort({ createdAt: -1 })
            .toArray();

          res.json({
            success: true,
            requests,
            count: requests.length,
          });
        } catch (error) {
          console.error("Error fetching adoption requests:", error);
          res.status(500).json({
            success: false,
            message: "Failed to fetch requests",
          });
        }
      }
    );

    // Get donation campaigns by email (owner only)
    app.get(
      "/donation-campaigns/:email",
      verifyJWT,
      verifyOwner,
      async (req, res) => {
        try {
          const { email } = req.params;

          const campaigns = await donationCampaigns
            .find({ owner: email })
            .sort({ createdAt: -1 })
            .toArray();

          res.json({
            success: true,
            campaigns,
            count: campaigns.length,
          });
        } catch (error) {
          console.error("Error fetching donation campaigns:", error);
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
      }
    );

    // Get donation transactions by email (owner only)
    app.get(
      "/donation-transactions-details/:email",
      verifyJWT,
      verifyOwner,
      async (req, res) => {
        try {
          const { email } = req.params;

          const transactions = await donations
            .find({ donatedBy: email })
            .sort({ createdAt: -1 })
            .toArray();

          res.json({
            success: true,
            transactions,
            count: transactions.length,
          });
        } catch (error) {
          console.error("Error fetching donation transactions:", error);
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
      }
    );

    // Keep all your existing routes but add JWT where needed...
    // [Include all your other existing routes here - stripe, donations, etc.]

    // Stripe payment intent (authenticated users only)
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      try {
        const { amount } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100,
          currency: "usd",
          payment_method_types: ["card"],
          metadata: {
            userId: req.decoded.userId,
            userEmail: req.decoded.email,
          },
        });

        res.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Stripe payment intent error:", error);
        res.status(500).json({
          success: false,
          message: "Payment processing error",
        });
      }
    });

    // Save donation (authenticated users only)
    app.post("/donations", verifyJWT, async (req, res) => {
      try {
        const donation = {
          ...req.body,
          donatedBy: req.decoded.email,
          createdAt: new Date(),
        };

        const result = await donations.insertOne(donation);

        res.status(201).json({
          success: true,
          message: "Donation saved successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving donation:", error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    // Test database connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Pet Adoption Server",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Pet Adoption Server is running",
    version: "1.0.0",
    endpoints: {
      auth: "/jwt, /verify-token, /logout",
      pets: "/pets, /available-pets",
      users: "/users, /register",
      donations: "/donations, /donation-campaigns",
    },
  });
});

app.listen(port, () => {
  console.log(`🚀 Pet Adoption Server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
});
