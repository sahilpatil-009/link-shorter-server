const express = require("express");
const app = express();
const dotenv = require("dotenv");
const ConnectDB = require("./dbConnect/dbConnect.js");
const cors = require("cors");
const userRoutes = require("./routes/user.js");
const dashboardRoutes = require("./routes/dashboard.js");
const Link = require("./models/link.model.js");
const Clicks = require("./models/clicks.model.js")
const detectDeviceType = require("./middleware/detectDeviceType.js");

dotenv.config({});

const port = process.env.PORT || 3000;

ConnectDB();
app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(400).send("Something went wrong");
});

app.use("/user", userRoutes);
app.use("/dashboard", dashboardRoutes);

// Redirect route for short links
app.get("/:shortLink", detectDeviceType, async (req, res) => {
  const { shortLink } = req.params;

  try {
    const link = await Link.findOne({ shortLink });

    if (!link) {
      return res
        .status(404)
        .json({ success: false, message: "Short link not found" });
    }

    const today = new Date();
    if (link.expireDate && link.expireDate < today) {
      return res.status(410).json({
        success: false,
        message: "This link has expired and is no longer active",
      });
    }

    // Save click information
    const clickData = {
      link: link._id,
      ipAddress: req.ip || "Unknown IP",
      userDevice: req.deviceType, // Mobile, Tablet, or Desktop
      originalLink: link.originalLink,
      shortLink: link.shortLink,
    };

    const userClick = new Clicks(clickData);
    await userClick.save();

    link.totalClicks = (link.totalClicks || 0) + 1;

    // Track device type clicks
    const deviceType = req.deviceType;
    link.deviceClicks = link.deviceClicks || {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    };
    link.deviceClicks[deviceType] = (link.deviceClicks[deviceType] || 0) + 1;

    // Track date-wise clicks
    const currentDate = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    link.dateClicks = link.dateClicks || [];
    const dateEntry = link.dateClicks.find(
      (entry) => entry.date === currentDate
    );

    if (dateEntry) {
      dateEntry.count += 1;
    } else {
      link.dateClicks.push({ date: currentDate, count: 1 });
    }

    // Save the updated link data
    await link.save();
    // Redirect the user to the original link
    return res.redirect(link.originalLink);
  } catch (error) {
    console.error("Error redirecting to original link:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.listen(port, () => {
  console.log(`listen on port ${port}`);
});
