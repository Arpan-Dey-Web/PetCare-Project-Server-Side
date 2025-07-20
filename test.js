    // update dontion-amount when a user paying
    app.put("/update-donation-amount", async (req, res) => {
      const { campaignId, amount } = req.body;

      // Validate input
      if (!campaignId || !amount || isNaN(amount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid campaign ID or amount",
        });
      }

      try {
        const filter = { _id: new ObjectId(campaignId) };

        // 1. First verify the campaign exists
        const campaign = await donationCampaigns.findOne(filter);
        if (!campaign) {
          return res.status(404).json({
            success: false,
            message: "Campaign not found",
          });
        }
console.log(donations);
        // 2. Update using updateOne
        const updateResult = await donationCampaigns.updateOne(filter, {
          $inc: { donatedAmount: parseFloat(amount) },
        });

        // 3. Verify the update was successful
        if (updateResult.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: "Failed to update donation amount",
          });
        }

        // 4. Get the updated campaign
        const updatedCampaign = await donationCampaigns.findOne(filter);

        res.json({
          success: true,
          message: "Donation amount updated!",
          updatedCampaign,
        });
      } catch (err) {
        console.error("Error updating donation amount:", err);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: err.message,
        });
      }
    });